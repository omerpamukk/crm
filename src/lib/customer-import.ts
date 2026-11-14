import { normalizePhone } from "@/lib/messaging/sms";

/**
 * Excel/CSV'den müşteri aktarımı (saf, testli). Dosya tarayıcıda okunur;
 * buradaki işlevler başlıkları alanlara eşler, satırları temizler ve dosya
 * içindeki tekrarları ayıklar. Veritabanındaki tekrarlar sunucuda elenir.
 */

export const IMPORT_FIELDS = [
  { key: "full_name", label: "Ad soyad", required: true },
  { key: "phone", label: "Telefon", required: false },
  { key: "email", label: "E-posta", required: false },
  { key: "birthday", label: "Doğum günü", required: false },
  { key: "note", label: "Not", required: false },
  { key: "consent", label: "Kampanya izni", required: false },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];
export type Mapping = Partial<Record<ImportField, number>>;

export type ImportRow = {
  full_name: string;
  /** 90XXXXXXXXXX biçiminde ya da null. */
  phone: string | null;
  email: string | null;
  /** YYYY-MM-DD ya da null. */
  birthday: string | null;
  note: string | null;
  consent: boolean;
};

export type ParsedImport = {
  rows: ImportRow[];
  /** Adı olmayan satırlar. */
  missingName: number;
  /** Telefonu yazılmış ama geçersiz olan satırlar (telefonsuz eklenir). */
  badPhone: number;
  /** Dosyada aynı telefonla ikinci kez geçen satırlar (eklenmez). */
  duplicateInFile: number;
};

export const MAX_IMPORT = 5000;

const fold = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıi̇]/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");

const GUESS: Record<ImportField, string[]> = {
  full_name: ["adsoyad", "adisoyadi", "musteri", "musteriadi", "isim", "isimsoyisim", "ad", "name", "fullname", "kisi"],
  phone: ["telefon", "tel", "cep", "ceptelefonu", "gsm", "telefonno", "telefonnumarasi", "numara", "phone", "mobile"],
  email: ["eposta", "email", "mail", "epostaadresi"],
  birthday: ["dogumgunu", "dogumtarihi", "dogum", "birthday", "birthdate"],
  note: ["not", "notlar", "aciklama", "note", "notes"],
  consent: ["kampanyaizni", "izin", "smsizni", "iysizni", "pazarlamaizni", "consent"],
};

/** Başlık satırından alan eşlemesi tahmini. */
export function guessMapping(headers: readonly unknown[]): Mapping {
  const folded = headers.map((h) => fold(String(h ?? "")));
  const used = new Set<number>();
  const out: Mapping = {};
  for (const f of IMPORT_FIELDS) {
    const idx = folded.findIndex((h, i) => !used.has(i) && h !== "" && GUESS[f.key].includes(h));
    const loose = idx >= 0 ? idx : folded.findIndex((h, i) => !used.has(i) && h !== "" && GUESS[f.key].some((g) => g.length > 3 && h.includes(g)));
    if (loose >= 0) {
      out[f.key] = loose;
      used.add(loose);
    }
  }
  return out;
}

const text = (v: unknown): string => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "15.03.1990", "1990-03-15", "15/3/1990", Date → "1990-03-15". */
export function parseBirthday(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  }
  const s = text(v);
  if (!s) return null;
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
    if (!match) return null;
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

const YES = new Set(["evet", "var", "e", "x", "1", "true", "yes", "izinli", "onayli", "verildi"]);

export function parseConsent(v: unknown): boolean {
  if (v === true) return true;
  return YES.has(fold(text(v)));
}

/** Telefon hücresi: Excel bazen sayıya çevirir (5321234567), başında 0 düşer. */
function phoneOf(v: unknown): string | null {
  const s = typeof v === "number" ? String(Math.round(v)) : text(v);
  return s ? normalizePhone(s) : null;
}

export function parseImport(dataRows: readonly (readonly unknown[])[], mapping: Mapping): ParsedImport {
  const col = (row: readonly unknown[], f: ImportField) => (mapping[f] == null ? undefined : row[mapping[f] as number]);
  const seen = new Set<string>();
  const out: ParsedImport = { rows: [], missingName: 0, badPhone: 0, duplicateInFile: 0 };

  for (const row of dataRows) {
    if (row.every((c) => text(c) === "")) continue;
    const full_name = text(col(row, "full_name")).replace(/\s+/g, " ");
    if (!full_name) {
      out.missingName++;
      continue;
    }
    const rawPhone = col(row, "phone");
    const phone = phoneOf(rawPhone);
    if (!phone && text(rawPhone) !== "") out.badPhone++;
    if (phone) {
      if (seen.has(phone)) {
        out.duplicateInFile++;
        continue;
      }
      seen.add(phone);
    }
    const email = text(col(row, "email")).toLowerCase();
    out.rows.push({
      full_name: full_name.slice(0, 120),
      phone,
      email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null,
      birthday: parseBirthday(col(row, "birthday")),
      note: text(col(row, "note")).slice(0, 500) || null,
      consent: parseConsent(col(row, "consent")),
    });
  }
  return out;
}

/** Basit CSV okuyucu (tırnak, ; ya da , ayırıcı). */
export function parseCsv(input: string): string[][] {
  const textIn = input.replace(/^﻿/, "");
  const firstLine = textIn.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < textIn.length; i++) {
    const ch = textIn[i];
    if (quoted) {
      if (ch === '"' && textIn[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && textIn[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
