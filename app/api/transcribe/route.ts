import { NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export const runtime = "nodejs";

// Helper to sanitize MIME types and prevent Gemini from expecting video frames in audio-only containers
const getAudioMimeType = (fileName: string, originalMime: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  
  if (ext === ".mp3" || ext === ".mpeg" || ext === ".mpg") return "audio/mp3";
  if (ext === ".m4a") return "audio/m4a";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".opus") return "audio/opus";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".mp4") return "audio/mp4";
  if (ext === ".webm") return "audio/webm";

  // Fallback: convert video/ to audio/ if it's treated as a video container
  if (originalMime && originalMime.startsWith("video/")) {
    return originalMime.replace("video/", "audio/");
  }

  return originalMime || "audio/mp3";
};

export async function POST(req: NextRequest) {
  let inputPath = "";
  const chunkFiles: string[] = [];
  
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File audio tidak ditemukan." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY tidak ditemukan di environment variables." }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Processing audio file: ${file.name} (${file.size} bytes)...`);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    const cleanMimeType = getAudioMimeType(file.name, file.type);

    console.log(`Sanitized MIME type from '${file.type}' to '${cleanMimeType}'`);

    // If file is small, send directly to Gemini API in a single request (Max 20MB payload)
    if (file.size <= 15 * 1024 * 1024) {
      console.log("Transcribing small file directly via Gemini 3.5 Flash...");
      const base64Data = buffer.toString("base64");
      
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMimeType,
                    data: base64Data,
                  },
                },
                {
                  text: "Tolong transkripsikan audio ini secara lengkap kata demi kata dalam bahasa Indonesia tanpa ada penafsiran atau penambahan komentar. Tuliskan teks hasil transkripsinya saja.",
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Transcribe Error: ${response.status} - ${errorText}`);
      }

      const resData = await response.json();
      const transcribedText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("Transcription successful!");
      return NextResponse.json({ text: transcribedText.trim() });
    }

    // Large file processing (> 15MB): Split using FFmpeg
    console.log("Large audio file detected. Initializing segmentation via FFmpeg...");
    
    const tempDir = os.tmpdir();
    const fileExt = path.extname(file.name) || ".mp3";
    const timestamp = Date.now();
    
    inputPath = path.join(tempDir, `input_${timestamp}${fileExt}`);
    await fs.promises.writeFile(inputPath, buffer);

    const outputPattern = path.join(tempDir, `chunk_${timestamp}_%03d${fileExt}`);
    const segmentTime = 600; // 10 minutes (600s)

    // Segment audio using FFmpeg without re-encoding (extremely fast!)
    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -f segment -segment_time ${segmentTime} -c copy "${outputPattern}"`;
    console.log(`Executing FFmpeg command: ${ffmpegCmd}`);
    
    await execPromise(ffmpegCmd);

    // Read the temp directory to find all generated chunk files
    const dirFiles = await fs.promises.readdir(tempDir);
    const chunkPrefix = `chunk_${timestamp}_`;
    
    const matchedFiles = dirFiles
      .filter((f) => f.startsWith(chunkPrefix))
      .sort(); // Crucial to keep chronological order!

    for (const f of matchedFiles) {
      chunkFiles.push(path.join(tempDir, f));
    }

    if (chunkFiles.length === 0) {
      throw new Error("FFmpeg gagal memecah berkas audio.");
    }

    console.log(`Audio successfully segmented into ${chunkFiles.length} chunks. Transcribing in parallel batches via Gemini 3.5 Flash...`);

    const transcripts: string[] = new Array(chunkFiles.length);
    const batchSize = 3; // Process 3 chunks concurrently to speed up transcription and respect RPM limits

    for (let i = 0; i < chunkFiles.length; i += batchSize) {
      const batch = chunkFiles.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (chunkPath, index) => {
          const chunkIndex = i + index;
          try {
            // Defensive check to verify file exists before attempting to read
            if (!fs.existsSync(chunkPath)) {
              console.warn(`[API] Chunk file missing: ${chunkPath}. Skipping.`);
              transcripts[chunkIndex] = "";
              return;
            }

            const chunkBuffer = await fs.promises.readFile(chunkPath);
            const chunkBase64 = chunkBuffer.toString("base64");
            const chunkMimeType = getAudioMimeType(chunkPath, file.type);

            console.log(`Transcribing chunk ${chunkIndex + 1}/${chunkFiles.length}: ${path.basename(chunkPath)} (${chunkBuffer.length} bytes)...`);
            
            const chunkResponse = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        inlineData: {
                          mimeType: chunkMimeType,
                          data: chunkBase64,
                        },
                      },
                      {
                        text: "Tolong transkripsikan audio ini secara lengkap kata demi kata dalam bahasa Indonesia tanpa ada penafsiran atau penambahan komentar. Tuliskan teks hasil transkripsinya saja.",
                      },
                    ],
                  },
                ],
              }),
            });

            if (!chunkResponse.ok) {
              const errorText = await chunkResponse.text();
              console.warn(`[API] Gemini Transcribe failed for chunk ${chunkIndex + 1}: ${errorText}`);
              transcripts[chunkIndex] = "";
              return;
            }

            const chunkData = await chunkResponse.json();
            const transcribedText = chunkData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            transcripts[chunkIndex] = transcribedText.trim();
          } catch (chunkErr) {
            console.error(`[API] Error transcribing chunk ${chunkIndex + 1}:`, chunkErr);
            transcripts[chunkIndex] = "";
          }
        })
      );

      // Short delay between batches to protect against Rate Limit (RPM) limits
      if (i + batchSize < chunkFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("All chunks processed. Joining transcripts...");
    const fullText = transcripts.filter(t => t !== "").join(" ");
    
    return NextResponse.json({ text: fullText });
  } catch (error: any) {
    console.error("Gemini Transcription Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses transkripsi audio." },
      { status: 500 }
    );
  } finally {
    // Cleanup temporary files to avoid leaking disk space
    console.log("Cleaning up temp files...");
    try {
      if (inputPath && fs.existsSync(inputPath)) {
        await fs.promises.unlink(inputPath);
      }
      for (const chunkPath of chunkFiles) {
        if (fs.existsSync(chunkPath)) {
          await fs.promises.unlink(chunkPath);
        }
      }
    } catch (cleanupErr) {
      console.error("Error during cleanup:", cleanupErr);
    }
  }
}
