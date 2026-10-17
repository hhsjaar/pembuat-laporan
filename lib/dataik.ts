// Klien server untuk Data IK (acuan nama & alamat baku). Hanya boleh diimpor dari kode server:
// token tidak boleh sampai ke browser. Semua fungsi tidak pernah melempar error -
// bila Data IK mati/lambat hasilnya kosong supaya pembuatan laporan tetap jalan.

const TIMEOUT_MS = 8000;

export type SaranKind = "lokasi" | "orang" | "personil";

export type Saran = {
  nilai: string;
  detail: string;
  terverifikasi: boolean;
  id?: string;
};

export type Acuan = {
  kind: "lokasi" | "orang";
  id: string;
  baku: string;
  detail: string;
  terverifikasi: boolean;
  ditemukan: string;
  ejaanBeda: boolean;
};

function config(): { url: string; token: string } | null {
  const url = process.env.DATAIK_URL?.replace(/\/+$/, "");
  const token = process.env.DATAIK_AGENT_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function panggil<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${cfg.token}`,
      },
    });
    if (!res.ok) {
      console.warn(`[Data IK] ${path} -> HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err: any) {
    console.warn(`[Data IK] ${path} gagal: ${err?.name || "error"}`);
    return null;
  }
}

export async function ambilSaran(kind: SaranKind, q: string, limit = 8): Promise<Saran[]> {
  const sp = new URLSearchParams({ kind, q, limit: String(limit) });
  const data = await panggil<{ items?: Saran[] }>(`/api/agent/saran?${sp}`);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function ambilAcuan(teks: string): Promise<Acuan[]> {
  if (!teks || teks.trim().length < 3) return [];
  const data = await panggil<{ items?: Acuan[] }>("/api/agent/acuan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teks: teks.slice(0, 60_000) }),
  });
  return Array.isArray(data?.items) ? data.items : [];
}

/**
 * Blok prompt "ACUAN BAKU" untuk Gemini. Kosong ("") bila tidak ada acuan.
 * Item terverifikasi diurutkan lebih dulu.
 */
export function blokAcuanPrompt(items: Acuan[]): string {
  if (!items.length) return "";
  const urut = [...items].sort((a, b) => Number(b.terverifikasi) - Number(a.terverifikasi));
  const baris = urut.map((a) => {
    const jenis = a.kind === "orang" ? "Orang/pejabat" : "Lokasi";
    const ket = a.kind === "orang" ? "jabatan" : "alamat";
    const tanda = a.terverifikasi ? " [TERVERIFIKASI]" : "";
    const detail = a.detail ? ` | ${ket}: ${a.detail}` : "";
    const koreksi = a.ejaanBeda && a.ditemukan ? ` | di masukan tertulis "${a.ditemukan}" -> ganti ke "${a.baku}"` : "";
    return `- ${jenis}${tanda}: ${a.baku}${detail}${koreksi}`;
  });
  return `
=========================================
ACUAN BAKU (wajib dipakai):
Daftar berikut berasal dari basis data resmi unit dan sudah dibenarkan pengguna.
${baris.join("\n")}
Aturan pemakaian:
1. Tulis nama orang persis seperti penulisan baku di atas (termasuk gelar dan ejaan). Tulis nama tempat/lokasi persis seperti penulisan baku.
2. Bila masukan menyebut orang atau tempat tersebut dengan ejaan lain, koreksi ke penulisan baku di seluruh teks laporan.
3. Pakai alamat dan jabatan sesuai acuan hanya bila laporan memerlukannya. Item bertanda [TERVERIFIKASI] diutamakan.
4. JANGAN mengarang alamat, jabatan, atau gelar yang tidak ada di acuan. Bila tidak ada di acuan dan tidak ada di masukan, jangan ditambahkan.
=========================================
`;
}
