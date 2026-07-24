import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType } from "docx";

export const runtime = "nodejs";

// Helper to parse double-asterisks **bold** in a string to a list of TextRun objects
function parseInlineFormatting(str: string, options?: { size?: number; bold?: boolean; color?: string }): TextRun[] {
  const parts = str.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, idx) => {
    const isBold = idx % 2 === 1 || options?.bold;
    return new TextRun({
      text: part,
      bold: isBold,
      color: options?.color || (isBold ? "1e3a8a" : "1f2937"), // Dark blue for bold highlights, dark gray for standard text
      size: options?.size || 22, // 11pt default
      font: "Arial",
    });
  });
}

// Smart heuristic to calculate proportional column widths for tables based on header names
function getColWidths(headers: string[]): number[] {
  const total = headers.length;
  let widths = new Array(total).fill(100 / total);

  // Look for "no" index (usually a very narrow sequence index)
  let noIdx = headers.findIndex((h) => {
    const l = h.toLowerCase().replace(/\s/g, "");
    return l === "no" || l === "n" || l === "nomor";
  });

  // Look for long text columns
  let longIndices: number[] = [];
  headers.forEach((h, idx) => {
    if (idx === noIdx) return;
    const l = h.toLowerCase();
    if (
      l.includes("kegiatan") ||
      l.includes("keterangan") ||
      l.includes("uraian") ||
      l.includes("detail") ||
      l.includes("kejadian") ||
      l.includes("hasil") ||
      l.includes("singkat") ||
      l.includes("info") ||
      l.includes("laporan") ||
      l.includes("kriminalitas")
    ) {
      longIndices.push(idx);
    }
  });

  if (noIdx !== -1) {
    widths[noIdx] = 6; // Assign a small 6% width for sequence/number column
  }

  const assignedSum = noIdx !== -1 ? 6 : 0;
  const remaining = 100 - assignedSum;
  const otherCount = total - (noIdx !== -1 ? 1 : 0);

  if (otherCount > 0) {
    if (longIndices.length > 0) {
      // Allocate 2.5x weight to long description columns
      const weightMap = new Array(total).fill(1);
      if (noIdx !== -1) weightMap[noIdx] = 0;
      longIndices.forEach((idx) => {
        weightMap[idx] = 2.5;
      });

      const totalWeight = weightMap.reduce((sum, w) => sum + w, 0);
      headers.forEach((_, idx) => {
        if (idx !== noIdx) {
          widths[idx] = (weightMap[idx] / totalWeight) * remaining;
        }
      });
    } else {
      headers.forEach((_, idx) => {
        if (idx !== noIdx) {
          widths[idx] = remaining / otherCount;
        }
      });
    }
  }

  return widths;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const lines = text.split("\n");
    const docChildren: any[] = [];

    // Header Title (Centered)
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "DRAFT ASISTEN SUARA AI - POLSEK TEMBALANG",
            bold: true,
            size: 26, // 13pt
            color: "4f46e5", // Indigo accent color
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
        const colWidths = getColWidths(headers);
        const colWidthsDxa = colWidths.map(pct => Math.floor((pct / 100) * 9026));

        const table = new Table({
          width: {
            size: 9026,
            type: WidthType.DXA,
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
              children: headers.map((h: string, idx: number) => 
                new TableCell({
                  width: {
                    size: colWidthsDxa[idx],
                    type: WidthType.DXA,
                  },
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
                      ],
                      spacing: { before: 40, after: 40 },
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
                children: row.map((cell: string, idx: number) => 
                  new TableCell({
                    width: {
                      size: colWidthsDxa[idx],
                      type: WidthType.DXA,
                    },
                    children: [
                      new Paragraph({
                        children: parseInlineFormatting(cell.trim()),
                        spacing: { before: 40, after: 40 },
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

      // Check Sub-headings
      if (trimmed.startsWith("###")) {
        docChildren.push(
          new Paragraph({
            children: parseInlineFormatting(trimmed.substring(3).trim(), { size: 24, bold: true, color: "1e3a8a" }),
            spacing: { before: 200, after: 100 },
            alignment: AlignmentType.LEFT,
          })
        );
        continue;
      } else if (trimmed.startsWith("##")) {
        docChildren.push(
          new Paragraph({
            children: parseInlineFormatting(trimmed.substring(2).trim(), { size: 26, bold: true, color: "1e3a8a" }),
            spacing: { before: 240, after: 120 },
            alignment: AlignmentType.LEFT,
          })
        );
        continue;
      }

      // Check Bullet List
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        currentList.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
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
            alignment: AlignmentType.JUSTIFIED,
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
            alignment: AlignmentType.JUSTIFIED,
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
