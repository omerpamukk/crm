"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import {
  IMPORT_FIELDS,
  MAX_IMPORT,
  guessMapping,
  parseCsv,
  parseImport,
  type ImportField,
  type Mapping,
} from "@/lib/customer-import";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/shared/form-sheet";

import { importCustomers } from "./import-actions";

const NUM = new Intl.NumberFormat("tr-TR");

const SELECT =
  "h-11 w-full min-w-0 rounded-[var(--radius-ctl)] border border-transparent bg-fill px-3 text-base text-label outline-none hover:bg-fill-2 focus-visible:border-[color:var(--primary)] focus-visible:shadow-[0_0_0_3px_var(--focus)] md:h-9 md:text-[0.875rem]";

type Loaded = { fileName: string; headers: string[]; rows: unknown[][] };

async function readFile(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") return parseCsv(await file.text());
  const { readSheet } = await import("read-excel-file/browser");
  return (await readSheet(file)) as unknown[][];
}

/** Örnek dosya: hangi sütunların okunduğunu gösterir. */
async function downloadTemplate() {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const head = IMPORT_FIELDS.map((f) => ({ value: f.label, fontWeight: "bold" as const }));
  await writeXlsxFile(
    [
      head,
      [{ value: "Ayşe Yılmaz" }, { value: "0532 111 22 33" }, { value: "ayse@ornek.com" }, { value: "15.03.1990" }, { value: "" }, { value: "Evet" }],
    ],
    { columns: [{ width: 24 }, { width: 18 }, { width: 26 }, { width: 14 }, { width: 24 }, { width: 14 }] }
  ).toFile("musteri-yukleme-ornegi.xlsx");
}

/**
 * Excel ya da CSV'den toplu müşteri yükleme. Dosya tarayıcıda okunur;
 * sütunlar tahminle eşlenir (değiştirilebilir); telefonu zaten kayıtlı
 * kişiler eklenmez.
 */
export function ImportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [consentAll, setConsentAll] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, start] = useTransition();

  function reset() {
    setLoaded(null);
    setMapping({});
    setConsentAll(false);
    setReadError(null);
    if (input.current) input.current.value = "";
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReadError(null);
    setReading(true);
    try {
      const all = (await readFile(file)).filter((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() !== ""));
      if (all.length < 2) {
        setReadError("Dosyada başlık satırı ve en az bir kişi olmalı.");
        setLoaded(null);
        return;
      }
      const headers = all[0].map((h, i) => String(h ?? "").trim() || `Sütun ${i + 1}`);
      setLoaded({ fileName: file.name, headers, rows: all.slice(1) });
      setMapping(guessMapping(headers));
    } catch (error) {
      console.error("import read:", error);
      setReadError("Dosya okunamadı. Excel (.xlsx) ya da CSV dosyası seçin.");
      setLoaded(null);
    } finally {
      setReading(false);
    }
  }

  const result = useMemo(() => (loaded ? parseImport(loaded.rows, mapping) : null), [loaded, mapping]);
  const tooMany = (result?.rows.length ?? 0) > MAX_IMPORT;
  const canSave = !!result && result.rows.length > 0 && mapping.full_name != null && !tooMany && !saving;

  function save() {
    if (!result) return;
    start(async () => {
      const res = await importCustomers({ rows: result.rows, consentAll });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const parts = [`${NUM.format(res.created ?? 0)} müşteri eklendi`];
      if (res.skipped) parts.push(`${NUM.format(res.skipped)} kişi zaten kayıtlıydı`);
      toast.success(parts.join(", "));
      onOpenChange(false);
      reset();
      router.refresh();
    });
  }

  function setField(f: ImportField, v: string) {
    setMapping((m) => {
      const next = { ...m };
      if (v === "") delete next[f];
      else next[f] = Number(v);
      return next;
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
      title="Excel'den yükle"
      description="Müşteri listenizi tek seferde ekleyin. Telefonu zaten kayıtlı kişiler tekrar eklenmez."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button disabled={!canSave} onClick={save}>
            {saving ? "Ekleniyor…" : result && result.rows.length > 0 ? `${NUM.format(result.rows.length)} kişiyi ekle` : "Ekle"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <input
            ref={input}
            id="imp-file"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <label
            htmlFor="imp-file"
            className="focus-ring hover-tint flex min-h-16 cursor-pointer items-center gap-3 rounded-xl bg-fill px-4 py-3"
          >
            <FileSpreadsheet aria-hidden className="size-6 shrink-0 text-label-2" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] font-medium text-label">
                {reading ? "Okunuyor…" : loaded ? loaded.fileName : "Dosya seçin"}
              </span>
              <span className="block truncate text-subhead text-label-2">
                {loaded ? `${NUM.format(loaded.rows.length)} satır · değiştirmek için dokunun` : "Excel (.xlsx) ya da CSV"}
              </span>
            </span>
          </label>
          {readError && <p className="text-subhead text-danger-text">{readError}</p>}
          <Button variant="plain" size="sm" className="px-1" onClick={() => void downloadTemplate()}>
            Örnek dosyayı indir
          </Button>
        </div>

        {loaded && (
          <div className="space-y-3">
            <p className="text-[0.8125rem] font-semibold text-label">Hangi sütun ne?</p>
            {IMPORT_FIELDS.map((f) => (
              <div key={f.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
                <Label htmlFor={`imp-${f.key}`} className="truncate">
                  {f.label}
                  {f.required && <span className="text-danger-text">*</span>}
                </Label>
                <select
                  id={`imp-${f.key}`}
                  value={mapping[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className={SELECT}
                >
                  <option value="">{f.required ? "Seçin" : "Yok"}</option>
                  {loaded.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className="space-y-1 rounded-xl bg-fill p-3 text-subhead text-label-2">
            {mapping.full_name == null ? (
              <p className="text-danger-text">Ad soyad sütununu seçin.</p>
            ) : (
              <p>
                <span className="font-semibold text-label">{NUM.format(result.rows.length)} kişi</span> eklenecek.
              </p>
            )}
            {result.duplicateInFile > 0 && <p>{NUM.format(result.duplicateInFile)} satır dosyada iki kez geçtiği için atlanacak.</p>}
            {result.missingName > 0 && <p>{NUM.format(result.missingName)} satırda ad olmadığı için atlanacak.</p>}
            {result.badPhone > 0 && <p>{NUM.format(result.badPhone)} kişinin telefonu okunamadı; telefonsuz eklenecek.</p>}
            {tooMany && <p className="text-danger-text">Tek seferde en fazla {NUM.format(MAX_IMPORT)} kişi eklenebilir. Dosyayı bölün.</p>}
          </div>
        )}

        {result && result.rows.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl bg-fill p-3">
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] font-medium text-label">Hepsinden kampanya mesajı izni alındı</p>
              <p className="text-subhead text-label-2">
                Açarsanız bu kişilere toplu SMS gidebilir. İzni olmayan kişiye ticari mesaj göndermek yasaktır.
                {mapping.consent != null && " İzin sütununda “evet” yazanlar zaten izinli sayılır."}
              </p>
            </div>
            <Switch checked={consentAll} onCheckedChange={setConsentAll} label="Hepsinden kampanya mesajı izni alındı" />
          </div>
        )}
      </div>
    </FormSheet>
  );
}
