// Parses a full, already-written Laporan Harian Situasi (as copied from WhatsApp) into the
// structured form fields used by the Laporan Harian form. Purely rule-based: no AI call, so
// prices and names are copied exactly as written.

type Line = { raw: string; key: string };

// Heading-matching key: no WhatsApp bold markers, single spaces
const toKey = (s: string) => s.replace(/\*/g, "").replace(/\s+/g, " ").trim();

const toLines = (text: string): Line[] =>
  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((raw) => {
      const cleaned = raw.replace(/\t+/g, " ").replace(/[  ]+$/g, "");
      return { raw: cleaned, key: toKey(cleaned) };
    });

function findIndex(lines: Line[], re: RegExp, from = 0): number {
  for (let i = Math.max(0, from); i < lines.length; i++) {
    if (re.test(lines[i].key)) return i;
  }
  return -1;
}

// Tidy a block: strip edge blank lines, collapse runs of blank lines, "1) x" -> "1. x"
function tidy(blockLines: string[], { renumber = false } = {}): string {
  let out = blockLines.map((l) => l.replace(/^\s+/, ""));
  if (renumber) out = out.map((l) => l.replace(/^(\d+)\)\s*/, "$1. "));
  const text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

// Content after a heading line (inline text after ":" counts) up to the first end heading
function section(lines: Line[], startRe: RegExp, endRes: RegExp[], from = 0, opts = {}): { text: string; end: number } | null {
  const start = findIndex(lines, startRe, from);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (endRes.some((re) => re.test(lines[i].key))) {
      end = i;
      break;
    }
  }
  const inline = lines[start].key.replace(startRe, "").replace(/^\s*:?\s*/, "");
  const body = lines.slice(start + 1, end).map((l) => l.raw);
  return { text: tidy(inline ? [inline, ...body] : body, opts), end };
}

const value = (lines: Line[], label: string, from = 0, to = lines.length): string => {
  const re = new RegExp(`^${label}\\s*:\\s*(.+)$`, "i");
  for (let i = from; i < to; i++) {
    const m = lines[i].key.match(re);
    if (m) return m[1].trim();
  }
  return "";
};

const COMMODITIES: { re: RegExp; min: string; max: string }[] = [
  { re: /beras/i, min: "berasMin", max: "berasMax" },
  { re: /kedelai/i, min: "kedelaiMin", max: "kedelaiMax" },
  { re: /cabai merah/i, min: "cabaiBesarMin", max: "cabaiBesarMax" },
  { re: /(cabai )?rawit/i, min: "cabaiRawitMin", max: "cabaiRawitMax" },
  { re: /tampar/i, min: "cabaiTamparMin", max: "cabaiTamparMax" },
  { re: /bawang merah/i, min: "bawangMerahMin", max: "bawangMerahMax" },
  { re: /bawang putih/i, min: "bawangPutihMin", max: "bawangPutihMax" },
  { re: /jagung/i, min: "jagungMin", max: "jagungMax" },
  { re: /gula/i, min: "gulaMin", max: "gulaMax" },
  { re: /minyak/i, min: "minyakMin", max: "minyakMax" },
  { re: /terigu/i, min: "teriguMin", max: "teriguMax" },
  { re: /daging sapi/i, min: "dagingSapiMin", max: "dagingSapiMax" },
  { re: /daging ayam/i, min: "dagingAyamMin", max: "dagingAyamMax" },
  { re: /telur/i, min: "telurMin", max: "telurMax" },
  { re: /garam/i, min: "garamMin", max: "garamMax" },
  { re: /lpg/i, min: "lpgMin", max: "lpgMax" },
];

const PRICE_RE = /Rp\.?\s*([\d.]+)/i;

function parsePrices(lines: Line[], from: number, to: number, out: Record<string, string>) {
  let current: (typeof COMMODITIES)[number] | null = null;
  for (let i = from; i < to; i++) {
    const key = lines[i].key;
    if (!/harga (terendah|tertinggi)/i.test(key)) {
      // Commodity title line, e.g. "a. Beras Medium" or "1) BERAS MEDIUM"
      const match = COMMODITIES.find((c) => c.re.test(key));
      if (match && key.length < 60) current = match;
      continue;
    }
    if (!current) continue;
    const price = key.match(PRICE_RE)?.[1]?.replace(/\.$/, "");
    if (!price) continue;
    if (/terendah/i.test(key)) out[current.min] = price;
    else out[current.max] = price;
  }
}

function parsePatrol(block: Line[], prefix: "patroliSiang" | "patroliMalam", out: Record<string, string>) {
  const nextHeading = [
    /^([a-z]\.|[IVX]+\.)?\s*(Personil|Sasaran|Rute|Route|Cara Bertindak|Hasil Giat)/i,
    /^[a-z]\.\s*Selama kegiatan/i,
    /^Selama kegiatan Patroli/i,
  ];

  const waktuLine = block.find((l) => /pukul/i.test(l.key));
  const waktu =
    value(block, "Pukul") ||
    waktuLine?.key.match(/pukul\s+(.+?)\s+telah dilaksanakan/i)?.[1] ||
    waktuLine?.key.match(/pukul\s+(\d{1,2}[.:]\d{2}.*?)(\s+(dalam|di)\s|$)/i)?.[1] ||
    "";
  if (waktu) out[`${prefix}Waktu`] = waktu;

  const cuaca = value(block, "Cuaca");
  if (cuaca) out[`${prefix}Cuaca`] = cuaca;

  const fields: [string, RegExp][] = [
    ["Personil", /^([a-z]\.\s*)?Personil\b/i],
    ["Sasaran", /^([a-z]\.\s*|[IVX]+\.\s*)?Sasaran\b/i],
    ["Rute", /^([a-z]\.\s*|[IVX]+\.\s*)?(Rute|Route)\b/i],
    ["Hasil", /^([a-z]\.\s*|[IVX]+\.\s*)?Hasil Giat( Yang Dicapai)?\b/i],
  ];
  for (const [name, re] of fields) {
    const sec = section(block, re, nextHeading, 0, { renumber: true });
    if (sec?.text) out[`${prefix}${name}`] = sec.text;
  }
}

// True when the text is already a structured Laporan Situasi (has the A. Politik, C. Sosial Budaya
// and D. Sosial Keamanan headings every real report carries). A free-form paste — patrol, prisoners
// and activities mixed together — returns false and needs AI sorting instead of this parser.
export function hasLaporanHeadings(text: string): boolean {
  const lines = toLines(text);
  return [/^A\.\s*Politik/i, /^C\.\s*Sosial Budaya/i, /^D\.\s*Sosial Keamanan/i].every((re) => findIndex(lines, re) !== -1);
}

export function parseLaporanHarianText(text: string): Record<string, string> {
  const lines = toLines(text);
  const out: Record<string, string> = {};

  const rencanaIdx = findIndex(lines, /^IV\.\s*RENCANA KEGIATAN/i);
  const headerEnd = rencanaIdx === -1 ? lines.length : rencanaIdx;

  // Header
  const hari = value(lines, "Hari", 0, headerEnd);
  const tanggal = value(lines, "Tanggal", 0, headerEnd);
  const waktu = value(lines, "Waktu", 0, headerEnd);
  if (hari) out.hari = hari;
  if (tanggal) out.tanggal = tanggal;
  if (waktu) out.waktu = waktu;

  // A. Politik
  const politik = section(lines, /^A\.\s*Politik\s*:?/i, [/^B\.\s*Ekonomi/i]);
  if (politik?.text) out.politik = politik.text;

  // B. Ekonomi -> price table
  const ekoStart = findIndex(lines, /^B\.\s*Ekonomi/i);
  const sosbudStart = findIndex(lines, /^C\.\s*Sosial Budaya/i, ekoStart);
  if (ekoStart !== -1) parsePrices(lines, ekoStart, sosbudStart === -1 ? headerEnd : sosbudStart, out);

  // C. Sosial Budaya
  const sosbud = section(lines, /^C\.\s*Sosial Budaya\s*:?/i, [/^D\.\s*Sosial Keamanan/i, /^E\.\s*Keamanan Negara/i]);
  if (sosbud?.text) out.sosbud = sosbud.text;

  // D. Sosial Keamanan
  const sosKam = section(lines, /^D\.\s*Sosial Keamanan\s*:?/i, [/^E\.\s*Keamanan Negara/i]);
  if (sosKam?.text) out.sosialKeamanan = sosKam.text;

  // E. Keamanan Negara
  const krim = section(lines, /^a\.\s*Kriminalitas\s*:?/i, [/^b\.\s*Laka Lantas/i, /^2\.\s*Keamanan Khusus/i]);
  if (krim?.text) out.kriminalitas = krim.text;
  const laka = section(lines, /^b\.\s*Laka Lantas\s*:?/i, [/^2\.\s*Keamanan Khusus/i, /^F\.\s*Bencana Alam/i]);
  if (laka?.text) out.lakaLantas = laka.text;
  const khusus = section(lines, /^2\.\s*Keamanan Khusus\s*:?/i, [/^F\.\s*Bencana Alam/i]);
  if (khusus?.text) {
    out.keamananKhusus = khusus.text;
    const total = khusus.text.match(/(\d+)\s*orang/i)?.[1];
    if (total) {
      out.tahananL = total;
      out.tahananP = "0";
    } else if (/tidak ada|nihil/i.test(khusus.text)) {
      out.tahananL = "0";
      out.tahananP = "0";
    }
  }

  // F. Bencana Alam
  const bencana = section(lines, /^F\.\s*Bencana Alam\s*:?/i, [/^G\.\s*Lain-?lain/i, /^II\.\s*KEGIATAN VVIP/i]);
  if (bencana?.text) out.bencanaAlam = bencana.text;

  // G. Lain-lain -> patrol blocks
  const lainStart = findIndex(lines, /^G\.\s*Lain-?lain/i);
  const vvipStart = findIndex(lines, /^II\.\s*KEGIATAN VVIP/i);
  if (lainStart !== -1) {
    const lainEnd = vvipStart === -1 ? headerEnd : vvipStart;
    const siangIdx = findIndex(lines, /^\d+\.\s*PATROLI\b.*SIANG/i, lainStart);
    const malamIdx = findIndex(lines, /^\d+\.\s*PATROLI\b.*MALAM/i, lainStart);
    if (siangIdx !== -1 && siangIdx < lainEnd) {
      const siangEnd = malamIdx > siangIdx && malamIdx < lainEnd ? malamIdx : lainEnd;
      parsePatrol(lines.slice(siangIdx + 1, siangEnd), "patroliSiang", out);
    }
    if (malamIdx !== -1 && malamIdx < lainEnd) {
      const malamEnd = siangIdx > malamIdx && siangIdx < lainEnd ? siangIdx : lainEnd;
      parsePatrol(lines.slice(malamIdx + 1, malamEnd), "patroliMalam", out);
    }
  }

  // II. VVIP / III. Catatan
  const vvip = section(lines, /^II\.\s*KEGIATAN VVIP\s*\/?\s*(VIP)?\s*:?/i, [/^III\.\s*CATATAN/i, /^IV\.\s*RENCANA/i]);
  if (vvip?.text) out.vvip = vvip.text;
  const catatan = section(lines, /^III\.\s*CATATAN\s*:?/i, [/^IV\.\s*RENCANA/i]);
  if (catatan?.text) out.catatan = catatan.text;

  // IV. Rencana Kegiatan
  if (rencanaIdx !== -1) {
    const rHari = value(lines, "Hari", rencanaIdx);
    const rTanggal = value(lines, "Tanggal", rencanaIdx);
    if (rHari) out.rencanaHari = rHari;
    if (rTanggal) out.rencanaTanggal = rTanggal;

    const rencanaEnds = [/^[B-E]\.\s/i, /^DUMP$/i, /^Hormat kami/i];
    const unras = section(lines, /^A\.\s*Unras\s*:?/i, rencanaEnds, rencanaIdx);
    if (unras?.text) out.rencanaUnras = unras.text;
    const menonjol = section(lines, /^B\.\s*Giat Menonjol\s*:?/i, rencanaEnds, rencanaIdx);
    if (menonjol?.text) out.rencanaGiatMenonjol = menonjol.text;
    const rPolitik = section(lines, /^C\.\s*Politik\s*:?/i, rencanaEnds, rencanaIdx);
    if (rPolitik?.text) out.rencanaPolitik = rPolitik.text;
    const masyarakat = section(lines, /^D\.\s*Giat Masyarakat\s*:?/i, [/^E\.\s*Kegiatan Personil/i, /^DUMP$/i, /^Hormat kami/i], rencanaIdx);
    if (masyarakat?.text) out.rencanaGiatMasyarakat = masyarakat.text;

    const personil = section(lines, /^E\.\s*Kegiatan Personil\s*:?/i, [/^DUMP$/i, /^Hormat kami/i], rencanaIdx);
    if (personil?.text) {
      const items = personil.text
        .split(/\n(?=\d+\.\s)/)
        .map((s) => s.replace(/^\d+\.\s*/, "").replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean);
      items.slice(0, 3).forEach((item, i) => (out[`rencanaPersonil${i + 1}`] = item));
    }
  }

  return out;
}
