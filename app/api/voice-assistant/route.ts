import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { geminiClient } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Fetch report history from Supabase
    let historyContext: any[] = [];
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("report_history")
        .select("id, created_at, template_type, perihal, content")
        .order("created_at", { ascending: false });

      if (!error && data) {
        historyContext = data;
      }
    }

    // 2. Format current context
    const now = new Date();
    const currentDateStr = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // 3. Format history records as a concise list to prevent hitting token limits
    const formattedHistory = historyContext.map((r, idx) => ({
      index: idx + 1,
      id: r.id,
      created_at: r.created_at,
      template_type: r.template_type,
      perihal: r.perihal,
      // Provide a snippet of content for semantic search
      contentSnippet: r.content ? r.content.substring(0, 1000) : "",
    }));

    // 4. Construct System Prompt for the Voice Assistant
    const systemPrompt = `Anda adalah asisten suara AI (Voice Assistant) resmi untuk Kepolisian Sektor (Polsek) Tembalang, Kota Semarang.
Tugas Anda adalah melayani dan membantu petugas untuk mencari data riwayat laporan, melakukan klasifikasi/kalkulasi statistik kriminalitas, laka lantas, bencana, dan data tahanan, serta mengarahkan pembuatan laporan baru.

Hari/Tanggal Saat Ini: ${currentDateStr}
Waktu Saat Ini: ${now.toLocaleTimeString("id-ID")}

Berikut adalah daftar riwayat seluruh laporan yang terdaftar di database Supabase:
${JSON.stringify(formattedHistory, null, 2)}

Aturan Kritis Respons:
1. Analisis kueri user secara mendalam terhadap riwayat laporan di atas.
2. Jika kueri menanyakan tentang jumlah atau kalkulasi statistik (contoh: "berapa kasus kriminal bulan ini?", "berapa kali patroli?", "berapa jumlah laporan kebakaran?"), Anda WAJIB melakukan klasifikasi dan perhitungan matematis secara eksak dari seluruh riwayat laporan. Di dalam nilai string "reply", Anda harus secara eksplisit menuliskan angka jumlah/kalkulasi tersebut (contoh: "Terdapat total 3 laporan kasus kriminalitas bulan ini...") diikuti dengan penjelasan rincian peristiwanya (tanggal dan perihal singkat) secara jelas.
3. Jika kueri mengindikasikan pencarian, filter, atau kalkulasi laporan (contoh: "cari laporan kebakaran", "tunjukkan laporan kemarin"), tetapkan action.type = "search_history", action.target = "kata kunci pencarian", serta masukkan semua laporan yang cocok ke dalam array "matchedReports". Di dalam nilai string "reply", Anda wajib menyebutkan jumlah laporan yang ditemukan (contoh: "Saya menemukan 2 laporan yang berkaitan dengan kebakaran...").
4. Jika kueri mengindikasikan perintah pembuatan laporan baru (contoh: "buat laporan baru", "buka form laporan harian khusus"), arahkan dengan mengubah jenis template: tetapkan action.type = "select_template", action.target = [ID_TEMPLATE] (pilih salah satu dari: "laporan-informasi", "laporan-kegiatan", "laporan-harian", "laporan-harian-khusus", "infosus", "laporan-harian-intelijen", "rencana-kegiatan").
5. Jika kueri merujuk ke laporan tertentu secara spesifik (contoh: "buka laporan nomor 3", "tunjukkan detail laporan kebakaran kemarin"), temukan id-nya dan tetapkan action.type = "view_report", action.target = [ID_LAPORAN_UUID].
6. Anda WAJIB memformat nilai string "reply" menggunakan Markdown jika menyajikan rincian, daftar, atau perbandingan data:
   - Gunakan format tebal dengan double asterisks (**teks**) untuk menyoroti/highlight angka jumlah, tanggal, lokasi, atau bagian penting.
   - Gunakan format bullet list ("- ") atau daftar berurutan ("1. ") jika memaparkan beberapa poin rincian kejadian.
   - Gunakan format tabel Markdown (| Judul Kolom |) jika menyajikan data kuantitatif komparatif (misal: perbandingan jumlah kasus per kategori) agar asisten dapat merendernya dalam bentuk tabel visual yang rapi.
7. Anda WAJIB mengembalikan respons hanya dalam format JSON murni dengan skema berikut:
{
  "reply": "Respons teks penjelasan terformat Markdown yang ramah (menyebutkan angka jumlah eksak hasil klasifikasi/perhitungan, rincian kejadian ter-highlight, list, atau tabel Markdown) dalam Bahasa Indonesia untuk dibacakan oleh asisten (sekitar 3-6 kalimat)",
  "action": {
    "type": "select_template" | "search_history" | "view_report" | "none",
    "target": "nilai target (ID template, ID laporan, kata kunci pencarian, atau kosongi jika none)"
  },
  "matchedReports": [
    {
      "id": "uuid laporan",
      "perihal": "perihal laporan",
      "created_at": "tanggal pembuatan",
      "template_type": "tipe template"
    }
  ]
}
Catatan: "matchedReports" hanya diisi jika user mencari/memfilter riwayat laporan.`;

    const userPrompt = `User Query: "${query}"`;

    let response;
    try {
      response = await geminiClient.chat.completions.create({
        model: "gemini-3.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
    } catch (apiErr: any) {
      console.error("[Gemini Voice Assistant API Error]:", apiErr);
      return NextResponse.json({
        reply: "Maaf, saya mengalami kendala koneksi ke server kecerdasan buatan. Silakan coba sesaat lagi.",
        action: { type: "none", target: "" },
        matchedReports: []
      });
    }

    const resultText = response?.choices[0]?.message?.content || "{}";
    let data;
    try {
      data = JSON.parse(resultText);
    } catch {
      data = {
        reply: "Maaf, saya kesulitan memproses instruksi tersebut saat ini.",
        action: { type: "none", target: "" },
        matchedReports: []
      };
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("POST /api/voice-assistant error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses asisten suara." },
      { status: 500 }
    );
  }
}
