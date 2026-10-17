import { NextRequest, NextResponse } from "next/server";
import { ambilSaran } from "@/lib/dataik";

export const runtime = "nodejs";

// GET /api/saran?kind=lokasi|orang|personil&q=...  -> proxy ke Data IK (token tetap di server)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kind = sp.get("kind");
  const q = (sp.get("q") ?? "").trim().slice(0, 100);
  if ((kind !== "lokasi" && kind !== "orang" && kind !== "personil") || q.length < 2) {
    return NextResponse.json({ items: [] });
  }
  return NextResponse.json({ items: await ambilSaran(kind, q) });
}
