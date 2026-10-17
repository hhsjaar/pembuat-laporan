"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Kind = "lokasi" | "orang" | "personil";

interface SaranItem {
  nilai: string;
  detail: string;
  terverifikasi: boolean;
  id?: string;
}

interface SaranInputProps {
  /** Jenis data di Data IK yang dicari. */
  kind: Kind;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** textarea (banyak baris) atau input satu baris. */
  multiline?: boolean;
  rows?: number;
  /**
   * "whole": seluruh isi kolom adalah satu nama (nama_ttd, lokasi).
   * "segment": kolom berisi daftar; saran memakai bagian di sekitar kursor (dipisah baris / titik koma / koma untuk lokasi).
   */
  mode?: "whole" | "segment";
  /** Cara menyisipkan saran ke kolom (default: nilai baku saja). */
  formatSisip?: (item: SaranItem) => string;
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

/** Cari batas segmen di sekitar kursor, dan bagian ketikan (tanpa penomoran) yang dipakai sebagai kata kunci. */
function segmenDiKursor(value: string, caret: number, kind: Kind) {
  const sep = kind === "lokasi" ? /[\n;,]/ : /[\n;]/;
  let start = 0;
  for (let i = caret - 1; i >= 0; i--) {
    if (sep.test(value[i])) { start = i + 1; break; }
  }
  let end = value.length;
  for (let i = caret; i < value.length; i++) {
    if (sep.test(value[i])) { end = i; break; }
  }
  const before = value.slice(start, caret);
  const lead = before.match(/^\s*(?:\d+[.)]\s*)?/)?.[0] ?? "";
  return { start: start + lead.length, end, query: before.slice(lead.length).trim() };
}

export default function SaranInput({
  kind,
  value,
  onValueChange,
  className = "",
  placeholder,
  multiline = false,
  rows = 2,
  mode = "whole",
  formatSisip,
}: SaranInputProps) {
  const [items, setItems] = useState<SaranItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; minWidth: number } | null>(null);
  const segRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  // Daftar ditampilkan lewat portal + posisi fixed agar tidak terpotong kontainer ber-overflow/transform.
  useEffect(() => {
    if (!open) return;
    const hitung = () => {
      const el = fieldRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ruangBawah = window.innerHeight - r.bottom;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 248));
      const minWidth = Math.min(Math.max(r.width, 240), 360);
      setPos(ruangBawah < 200 && r.top > ruangBawah
        ? { left, bottom: window.innerHeight - r.top + 4, minWidth }
        : { left, top: r.bottom + 4, minWidth });
    };
    hitung();
    window.addEventListener("scroll", hitung, true);
    window.addEventListener("resize", hitung);
    return () => {
      window.removeEventListener("scroll", hitung, true);
      window.removeEventListener("resize", hitung);
    };
  }, [open, items]);

  const cari = useCallback((nextValue: string, caret: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    const seg = mode === "segment"
      ? segmenDiKursor(nextValue, caret, kind)
      : { start: 0, end: nextValue.length, query: nextValue.trim() };
    segRef.current = { start: seg.start, end: seg.end };

    if (seg.query.length < MIN_CHARS) {
      setItems([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/saran?kind=${kind}&q=${encodeURIComponent(seg.query)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list: SaranItem[] = Array.isArray(data?.items) ? data.items : [];
        setItems(list);
        setActive(-1);
        setOpen(list.length > 0);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setItems([]);
        setOpen(false);
      }
    }, DEBOUNCE_MS);
  }, [kind, mode]);

  const pilih = (item: SaranItem) => {
    const sisip = formatSisip ? formatSisip(item) : item.nilai;
    const { start, end } = segRef.current;
    const next = value.slice(0, start) + sisip + value.slice(end);
    onValueChange(next);
    setOpen(false);
    setItems([]);
    setActive(-1);
    const pos = start + sisip.length;
    requestAnimationFrame(() => {
      const el = fieldRef.current;
      if (el) {
        el.focus();
        try { el.setSelectionRange(pos, pos); } catch { /* tipe input tanpa seleksi */ }
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    onValueChange(v);
    cari(v, e.target.selectionStart ?? v.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pilih(items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const common = {
    value,
    placeholder,
    className,
    autoComplete: "off",
    role: "combobox" as const,
    "aria-expanded": open,
    "aria-autocomplete": "list" as const,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: () => setOpen(false),
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea ref={fieldRef as React.RefObject<HTMLTextAreaElement>} rows={rows} {...common} />
      ) : (
        <input ref={fieldRef as React.RefObject<HTMLInputElement>} type="text" {...common} />
      )}
      {open && items.length > 0 && pos && createPortal(
        <ul
          role="listbox"
          style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.minWidth, maxWidth: 360 }}
          className="z-[1000] max-h-64 w-max overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-1 text-left shadow-lg"
        >
          {items.map((it, i) => (
            <li
              key={`${it.id ?? it.nilai}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (bukan click) agar terpilih sebelum kolom kehilangan fokus
              onMouseDown={(e) => { e.preventDefault(); pilih(it); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 text-sm font-normal normal-case tracking-normal ${
                i === active ? "bg-neutral-100 dark:bg-neutral-800" : ""
              }`}
            >
              <div className="flex items-center gap-1.5 text-neutral-900 dark:text-white">
                <span className="truncate">{it.nilai}</span>
                {it.terverifikasi && (
                  <span title="Terverifikasi" className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">✓</span>
                )}
              </div>
              {it.detail && (
                <div className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{it.detail}</div>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
