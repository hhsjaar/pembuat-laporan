import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } from "docx";

export const runtime = "nodejs";

// Helper to parse double-asterisks **bold** in a string to a list of TextRun objects
function parseInlineFormatting(str: string): TextRun[] {
  const parts = str.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, idx) => {
    const isBold = idx % 2 === 1;
    return new TextRun({
      text: part,
      bold: isBold,
      color: isBold ? "1e3a8a" : "1f2937", // Dark blue for bold highlights, dark gray for standard text
      size: 22, // 11pt
      font: "Arial",
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const lines = text.split("\n");
    const docChildren: any[] = [];

    // Header Title
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "DRAFT ASISTEN SUARA AI - POLSEK TEMBALANG",
            bold: true,
            size: 26, // 13pt
            color: "4f46e5", // Indigo color accent
            font: "Arial",
          }),
        ],
        spacing: { after: 300 },
      })
    );

    let currentList: any[] = [];
    let inList = false;
    let tableRows: string[][] = [];
    let inTable = false;

    const flushList = () => {
      if (currentList.length > 0) {
        currentList.forEach((p: any) => {
          docChildren.push(p);
        });
        currentList = [];
        inList = false;
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const rows = tableRows.slice(1).filter((row: string[]) => !row.every((cell: string) => cell.match(/^:?-+:?$/)));

        const table = new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 8, color: "cccccc" },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: "cccccc" },
            left: { style: BorderStyle.SINGLE, size: 8, color: "cccccc" },
            right: { style: BorderStyle.SINGLE, size: 8, color: "cccccc" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb" },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb" },
          },
          rows: [
            // Header Row
            new TableRow({
              children: headers.map((h: string) => 
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: h.trim(),
                          bold: true,
                          size: 20, // 10pt
                          color: "374151",
                          font: "Arial",
                        })
                      ]
                    })
                  ],
                  shading: { fill: "f3f4f6", type: ShadingType.CLEAR },
                  margins: { top: 120, bottom: 120, left: 150, right: 150 },
                })
              )
            }),
            // Data Rows
            ...rows.map((row: string[]) => 
              new TableRow({
                children: row.map((cell: string) => 
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: parseInlineFormatting(cell.trim())
                      })
                    ],
                    margins: { top: 100, bottom: 100, left: 150, right: 150 },
                  })
                )
              })
            )
          ]
        });

        docChildren.push(table);
        // Add spacing after table
        docChildren.push(new Paragraph({ spacing: { before: 150 } }));
        tableRows = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check Table
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        flushList();
        inTable = true;
        const cells = trimmed
          .split("|")
          .slice(1, -1)
          .map((c: string) => c.trim());
        tableRows.push(cells);
        continue;
      } else {
        flushTable();
      }

      // Check Bullet List
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        currentList.push(
          new Paragraph({
            children: parseInlineFormatting(trimmed.substring(2)),
            bullet: { level: 0 },
            spacing: { after: 100 },
          })
        );
        continue;
      } else if (trimmed.match(/^\d+\.\s/)) {
        // Numbered List
        inList = true;
        const match = trimmed.match(/^(\d+)\.\s(.*)/);
        currentList.push(
          new Paragraph({
            children: parseInlineFormatting(match ? match[2] : trimmed),
            bullet: { level: 0 }, // represented as standard bullet in docx styling
            spacing: { after: 100 },
          })
        );
        continue;
      } else {
        flushList();
      }

      // Regular Paragraph
      if (trimmed.length > 0) {
        docChildren.push(
          new Paragraph({
            children: parseInlineFormatting(line),
            spacing: { after: 150 },
          })
        );
      } else {
        // Empty spacer
        docChildren.push(
          new Paragraph({
            spacing: { after: 80 },
          })
        );
      }
    }

    // Flush any remaining blocks
    flushList();
    flushTable();

    // Create Document Wrapper
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=draft-asisten-suara.docx",
      },
    });

  } catch (error: any) {
    console.error("POST /api/export-assistant-docx error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengekspor draf laporan harian." },
      { status: 500 }
    );
  }
}
