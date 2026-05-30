import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { templateType, reportData } = await req.json();

    if (!templateType || !reportData) {
      return NextResponse.json(
        { error: "Parameter templateType dan reportData diperlukan." },
        { status: 400 }
      );
    }

    // Mapping template filenames
    const templateFilenameMap: Record<string, string> = {
      "laporan-informasi": "laporan-informasi.docx",
      "laporan-harian-khusus": "laporan-harian-khusus.docx",
      "laporan-khusus-3": "laporan-khusus-3.docx",
    };

    const templateName = templateFilenameMap[templateType];
    if (!templateName) {
      return NextResponse.json(
        { error: "Jenis template laporan tidak valid." },
        { status: 400 }
      );
    }

    const templatePath = path.join(process.cwd(), "templates", templateName);
    console.log(`Loading Word template from: ${templatePath}...`);

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Berkas template '${templateName}' tidak ditemukan di server.` },
        { status: 500 }
      );
    }

    // Read the docx template as binary content
    const content = fs.readFileSync(templatePath, "binary");

    // Initialize PizZip with the binary content
    const zip = new PizZip(content);

    // Helper to convert multiline text into high-fidelity, self-contained OpenXML paragraphs
    const convertTextToOpenXml = (text: string, prefix: string = "", leftIndent: number = 1440): string => {
      if (!text) return "";
      
      const lines = text.split(/\r?\n/);
      const escapedLines = lines.map((line) => {
        return line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      });
      
      let xml = "";
      
      for (let i = 0; i < escapedLines.length; i++) {
        const line = escapedLines[i];
        
        if (i === 0 && prefix) {
          // First line with bullet prefix and tab, matching police report margins
          xml += `<w:p><w:pPr><w:ind w:left="${leftIndent}" w:hanging="720"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr><w:t xml:space="preserve">${prefix}</w:t><w:tab/><w:t xml:space="preserve">${line}</w:t></w:r></w:p>`;
        } else if (line.trim() === "") {
          // Empty paragraph spacing
          xml += `<w:p><w:pPr><w:spacing w:after="120"/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve"></w:t></w:r></w:p>`;
        } else {
          // Regular paragraph matching police report indentation (1.25cm / 1440 dxa) and Calibri font
          xml += `<w:p><w:pPr><w:ind w:left="${leftIndent}"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr><w:t xml:space="preserve">${line}</w:t></w:r></w:p>`;
        }
      }
      return xml;
    };

    // Custom tag-cleaning algorithm to merge split runs within curly braces
    const cleanXmlTags = (xml: string): string => {
      let result = "";
      let inBraces = 0;
      let i = 0;
      
      while (i < xml.length) {
        const char = xml[i];
        
        if (char === "{") {
          inBraces++;
          result += char;
          i++;
        } else if (char === "}") {
          inBraces--;
          if (inBraces < 0) inBraces = 0;
          result += char;
          i++;
        } else if (inBraces > 0) {
          if (char === "<") {
            while (i < xml.length && xml[i] !== ">") {
              i++;
            }
            if (i < xml.length) {
              i++; // skip the >
            }
          } else {
            result += char;
            i++;
          }
        } else {
          result += char;
          i++;
        }
      }
      return result;
    };

    // Preprocess template if it's "Laporan Informasi" to enable raw XML parsing for multiline paragraphs
    if (templateType === "laporan-informasi") {
      let docXml = zip.files["word/document.xml"].asText();
      
      // 1. Clean up any split runs inside the placeholders
      docXml = cleanXmlTags(docXml);

      // 2. Remove preceding bullets inside B, C, D paragraphs using precise literal string replacements (properly closing runs and using double curly delimiters)
      const targetB = '<w:t xml:space="preserve">B. </w:t><w:tab/></w:r><w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000"><w:rPr><w:rFonts w:ascii="Calibri" w:cs="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri"/><w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">{{B}}</w:t></w:r>';
      docXml = docXml.replace(
        targetB,
        '<w:t xml:space="preserve">{{@B}}</w:t></w:r>'
      );

      const targetC = '<w:t xml:space="preserve">C. </w:t><w:tab/></w:r><w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000"><w:rPr><w:rFonts w:ascii="Calibri" w:cs="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri"/><w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">{{C}}</w:t></w:r>';
      docXml = docXml.replace(
        targetC,
        '<w:t xml:space="preserve">{{@C}}</w:t></w:r>'
      );

      const targetD = '<w:t xml:space="preserve">D.</w:t><w:tab/><w:t xml:space="preserve">{{D}}</w:t>';
      docXml = docXml.replace(
        targetD,
        '<w:t xml:space="preserve">{{@D}}</w:t>'
      );

      // 3. Replace remaining multiline fields with raw XML tags using double curly delimiters
      const otherFields = ["analisa", "prediksi", "langkah", "rekomendasi"];
      otherFields.forEach((field) => {
        const regex = new RegExp(`\\{\\{${field}\\}\\}`, "g");
        docXml = docXml.replace(regex, `{{@${field}}}`);
      });

      zip.file("word/document.xml", docXml);
    }

    // Initialize Docxtemplater with custom delimiters (double curly braces)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true, // Crucial fallback for other standard templates
      delimiters: {
        start: "{{",
        end: "}}"
      }
    });

    const isLaporanInformasi = templateType === "laporan-informasi";

    const renderData: Record<string, any> = {
      tanggal: reportData.tanggal || "",
      lokasi: reportData.lokasi || "",
      judul: reportData.judul || "",
      isi_laporan: reportData.isi_laporan || "",
      kesimpulan: reportData.kesimpulan || "",
      
      // Laporan Informasi placeholders
      bidang: reportData.bidang || "",
      perihal: reportData.perihal || "",
      "cara-mendapatkan-informasi": reportData["cara-mendapatkan-informasi"] || "",
      "waktu-mendapatkan-informasi": reportData["waktu-mendapatkan-informasi"] || "",
      A: reportData.A || "",
      B: isLaporanInformasi ? convertTextToOpenXml(reportData.B || "", "B. ") : (reportData.B || ""),
      C: isLaporanInformasi ? convertTextToOpenXml(reportData.C || "", "C. ") : (reportData.C || ""),
      D: isLaporanInformasi ? convertTextToOpenXml(reportData.D || "", "D. ") : (reportData.D || ""),
      analisa: isLaporanInformasi ? convertTextToOpenXml(reportData.analisa || "") : (reportData.analisa || ""),
      prediksi: isLaporanInformasi ? convertTextToOpenXml(reportData.prediksi || "") : (reportData.prediksi || ""),
      langkah: isLaporanInformasi ? convertTextToOpenXml(reportData.langkah || "") : (reportData.langkah || ""),
      rekomendasi: isLaporanInformasi ? convertTextToOpenXml(reportData.rekomendasi || "") : (reportData.rekomendasi || ""),
    };

    doc.render(renderData);

    // Generate output zip as a Node buffer
    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    console.log(`Document exported successfully: ${templateName} populated.`);

    // Set headers to trigger a browser download
    const headers = new Headers();
    headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    headers.set("Content-Disposition", `attachment; filename="${templateType}-${Date.now()}.docx"`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Export DOCX API Error:", error);
    if (error.properties && error.properties.errors) {
      console.error("Underlying docxtemplater errors:");
      error.properties.errors.forEach((err: any) => {
        console.error("- Error ID:", err.id, "| Message:", err.message, "| Properties:", JSON.stringify(err.properties || {}));
      });
      return NextResponse.json(
        { 
          error: `Gagal memformat dokumen Word. Detail: ${error.properties.errors.map((e: any) => e.message).join("; ")}` 
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Gagal mengekspor laporan ke format Microsoft Word." },
      { status: 500 }
    );
  }
}
