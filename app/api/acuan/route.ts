import { NextRequest, NextResponse } from "next/server";
import { ambilAcuan } from "@/lib/dataik";

export const runtime = "nodejs";

// POST /api/acuan { teks } -> penulisan baku nama/lokasi yang disebut di teks (proxy ke Data IK)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const teks = typeof body?.teks === "string" ? body.teks : "";
  return NextResponse.json({ items: await ambilAcuan(teks) });
}
