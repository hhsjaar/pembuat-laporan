import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase belum dikonfigurasi di berkas .env.local Anda." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("report_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/history error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengambil riwayat laporan." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase belum dikonfigurasi di berkas .env.local Anda." },
        { status: 400 }
      );
    }

    const { template_type, perihal, content, kapolsek_nama, meta_data } = await req.json();

    if (!template_type || !perihal || !content) {
      return NextResponse.json(
        { error: "Parameter wajib tidak lengkap (template_type, perihal, content)." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("report_history")
      .insert([
        {
          template_type,
          perihal,
          content,
          kapolsek_nama: kapolsek_nama || "KOMPOL KRISTIYASTUTI HANDAYANI, S.H., M.H.",
          meta_data: meta_data || {},
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error("POST /api/history error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan riwayat laporan." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase belum dikonfigurasi di berkas .env.local Anda." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID laporan wajib disertakan." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("report_history")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Laporan berhasil dihapus dari riwayat." });
  } catch (error: any) {
    console.error("DELETE /api/history error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus riwayat laporan." },
      { status: 500 }
    );
  }
}
