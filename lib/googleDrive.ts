// Klien Google Drive minimal (read-only) lewat service account -- tanpa
// dependensi tambahan: JWT RS256 ditandatangani dengan node:crypto, lalu REST
// API Drive v3 dipanggil langsung dengan fetch. Dipakai hanya di sisi server.
//
// Env:
//   GOOGLE_SERVICE_ACCOUNT_JSON  isi file kunci JSON service account (boleh
//                                mentah atau di-base64-kan supaya aman di Vercel)
// Folder Drive HARUS dibagikan (Viewer) ke client_email service account itu.

import { createSign } from "node:crypto";
import PizZip from "pizzip";

const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const FETCH_TIMEOUT_MS = 10_000;

const MIME_FOLDER = "application/vnd.google-apps.folder";
const MIME_GDOC = "application/vnd.google-apps.document";
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      // Env var sering menyimpan newline sebagai "\n" literal
      private_key: String(parsed.private_key).replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

export function isDriveConfigured(): boolean {
  return loadServiceAccount() !== null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const sa = loadServiceAccount();
  if (!sa) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON belum diatur / tidak valid.");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claim}`).sign(sa.private_key);
  const assertion = `${header}.${claim}.${b64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gagal login ke Google (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

async function driveGet(path: string, params: Record<string, string>): Promise<Response> {
  const token = await getAccessToken();
  const url = `${DRIVE_API}${path}?${new URLSearchParams({ supportsAllDrives: "true", ...params })}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Drive API ${path} gagal (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res;
}

async function listChildren(folderId: string): Promise<DriveFile[]> {
  if (!/^[\w-]+$/.test(folderId)) throw new Error("ID folder Drive tidak valid.");
  const res = await driveGet("/files", {
    q: `'${folderId}' in parents and trashed = false`,
    orderBy: "modifiedTime desc",
    pageSize: "100",
    fields: "files(id,name,mimeType,modifiedTime)",
    includeItemsFromAllDrives: "true",
    corpora: "allDrives",
  });
  return ((await res.json()) as { files: DriveFile[] }).files ?? [];
}

/**
 * Berkas terbaru (urut modifiedTime menurun) di folder + subfolder (maks 2
 * tingkat, supaya struktur arsip per-bulan/per-tahun tetap terbaca).
 */
export async function listRecentFiles(folderId: string, limit = 12): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let level: string[] = [folderId];

  for (let depth = 0; depth < 3 && level.length > 0; depth++) {
    const nextLevel: string[] = [];
    const listings = await Promise.all(level.map(listChildren));
    for (const children of listings) {
      for (const f of children) {
        if (f.mimeType === MIME_FOLDER) nextLevel.push(f.id);
        else files.push(f);
      }
    }
    level = nextLevel.slice(0, 30);
  }

  files.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
  return files.slice(0, limit);
}

/**
 * Berkas (bukan folder) yang namanya memuat `awalan`, terbaru dulu -- dari
 * seluruh Drive yang terlihat oleh service account. Pencocokan "contains" Drive
 * longgar, jadi pemanggil tetap harus menyaring ulang namanya.
 */
export async function cariBerkasByNama(awalan: string, limit = 50): Promise<DriveFile[]> {
  if (!/^[A-Za-z]{1,20}$/.test(awalan)) throw new Error("Awalan nama berkas tidak valid.");
  const res = await driveGet("/files", {
    q: `name contains '${awalan}' and trashed = false and mimeType != '${MIME_FOLDER}'`,
    orderBy: "modifiedTime desc",
    pageSize: String(limit),
    fields: "files(id,name,mimeType,modifiedTime)",
    includeItemsFromAllDrives: "true",
    corpora: "allDrives",
  });
  return ((await res.json()) as { files: DriveFile[] }).files ?? [];
}

function docxToText(buf: ArrayBuffer): string {
  const zip = new PizZip(buf);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\/>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Teks isi berkas (Google Docs, .docx, atau teks biasa). Format lain -> "". */
export async function readFileText(file: DriveFile): Promise<string> {
  if (file.mimeType === MIME_GDOC) {
    const res = await driveGet(`/files/${file.id}/export`, { mimeType: "text/plain" });
    return res.text();
  }
  if (file.mimeType === MIME_DOCX) {
    const res = await driveGet(`/files/${file.id}`, { alt: "media" });
    return docxToText(await res.arrayBuffer());
  }
  if (file.mimeType.startsWith("text/")) {
    const res = await driveGet(`/files/${file.id}`, { alt: "media" });
    return res.text();
  }
  return "";
}
