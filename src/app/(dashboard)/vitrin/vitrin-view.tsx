"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Banknote,
  CalendarX2,
  ChevronLeft,
  ListFilter,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AppointmentBlock } from "@/components/shared/appointment-block";
import { TimeGrid, type GridColumn } from "../takvim/time-grid";
import { Legend, type Placed } from "../takvim/parts";
import { mobileTabsForRole, navSectionsForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toastUndo } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToolbarIsolation } from "@/components/layout/toolbar-context";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { DeltaPill } from "@/components/shared/delta-pill";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar, FilterToken } from "@/components/shared/filter-bar";
import { FormActions, FormSheet } from "@/components/shared/form-sheet";
import { GeldiButton } from "@/components/shared/geldi-button";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { Money } from "@/components/shared/money";
import { PackageProgress } from "@/components/shared/package-progress";
import { PageHeader } from "@/components/shared/page-header";
import { KpiRowSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { Sparkline } from "@/components/shared/sparkline";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, StatusDot, StatusIcons } from "@/components/shared/status";
import { SwipeRow } from "@/components/shared/swipe-row";
import { TrendChart, type TrendPoint } from "@/components/shared/trend-chart";

/* ----------------------------- Örnek veri ----------------------------- */

const CIRO_14 = [2100, 2600, 1900, 3200, 2800, 3500, 3100, 2900, 3800, 3300, 4100, 3600, 4300, 4800];

type Musteri = {
  id: string;
  ad: string;
  tel: string;
  etiket?: string;
  hizmet: string;
  kullanilan: number;
  toplam: number;
  sonraki: string | null;
  uzman: string;
  durum: "Aktif" | "Yeni" | "Pasif";
  deger: number;
  borc: number;
  gecikmis?: boolean;
};

const MUSTERILER: Musteri[] = [
  { id: "1", ad: "Derya Koç", tel: "0533 902 15 47", etiket: "Taksitli", hizmet: "Reformer Pilates", kullanilan: 3, toplam: 12, sonraki: "Bugün 17:00", uzman: "Elif", durum: "Aktif", deger: 6000, borc: 3000, gecikmis: true },
  { id: "2", ad: "Zeynep Arslan", tel: "0532 418 27 63", etiket: "VIP", hizmet: "Cilt Bakımı", kullanilan: 6, toplam: 10, sonraki: "Bugün 10:30", uzman: "Merve", durum: "Aktif", deger: 14500, borc: 2000 },
  { id: "3", ad: "Hakan Tunç", tel: "0532 640 18 25", hizmet: "Fizyoterapi", kullanilan: 1, toplam: 6, sonraki: "Yarın 18:00", uzman: "Burak", durum: "Yeni", deger: 3000, borc: 4200 },
  { id: "4", ad: "Ayşe Yıldız", tel: "0541 237 90 12", hizmet: "Lazer Epilasyon", kullanilan: 7, toplam: 8, sonraki: "7 Kas Cmt 14:00", uzman: "Selin", durum: "Aktif", deger: 9600, borc: 0 },
  { id: "5", ad: "Can Aksoy", tel: "0544 380 72 19", hizmet: "Danışmanlık Görüşmesi", kullanilan: 1, toplam: 1, sonraki: "12 Kas Per 11:30", uzman: "Elif", durum: "Yeni", deger: 1800, borc: 0 },
  { id: "6", ad: "Mehmet Öztürk", tel: "0505 611 44 08", hizmet: "Medikal Masaj", kullanilan: 6, toplam: 6, sonraki: null, uzman: "Burak", durum: "Pasif", deger: 7200, borc: 0 },
];

const DURUM_VARIANT = { Aktif: "positive", Yeni: "info", Pasif: "neutral" } as const;

/* ----------------------------- Yardımcılar ----------------------------- */

type Mode = "tek" | "yan";
const ModeCtx = React.createContext<Mode>("tek");

/** Bölüm: başlık + açıklama + örnek. "Yan yana" kipinde açık ve koyu panel. */
function Section({
  id,
  title,
  note,
  children,
  wide,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
  /** Yan yana kipinde bile tek sütun (geniş örnekler). */
  wide?: boolean;
}) {
  const mode = React.useContext(ModeCtx);
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-20 space-y-3">
      <div className="mx-1">
        <h2 id={`${id}-t`} className="section-title">
          {title}
        </h2>
        {note && <p className="mt-0.5 max-w-3xl text-subhead text-label-2w">{note}</p>}
      </div>
      {mode === "yan" ? (
        <div className={cn("grid gap-4", !wide && "lg:grid-cols-2")}>
          <Panel theme="theme-light">{children}</Panel>
          <Panel theme="dark">{children}</Panel>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Panel({ theme, children }: { theme: "theme-light" | "dark"; children: React.ReactNode }) {
  return (
    <div className={cn(theme, "min-w-0 rounded-[20px] bg-background p-4 text-foreground")}>
      <p className="section-label mb-3">{theme === "dark" ? "Koyu" : "Açık"}</p>
      {children}
    </div>
  );
}

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>;
}

function Demo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("surface min-w-0 space-y-3 p-4", className)}>
      <p className="section-label truncate" title={label}>{label}</p>
      {children}
    </div>
  );
}

/* ------------------------------- Takvim -------------------------------- */

const TK_PERSONEL = ["Merve Kaya", "Selin Çelik", "Burak Demir", "Elif Şahin", "Deniz Arslan"];

function tk(id: string, staff: number, name: string, service: string, start: string, dur: number, status: string): Placed {
  const [h, m] = start.split(":").map(Number);
  const startMin = h * 60 + m;
  return {
    id, created_at: "", business_id: "", customer_id: null, service_id: null, starts_at: "", staff_id: null,
    status, note: null, package_id: null, price: null, staff_member_id: `p${staff}`, booked_online: false,
    arrived_at: null, customer_name: name, service_name: service, staff_name: TK_PERSONEL[staff], duration: dur,
    dayKey: "2026-11-05", startMin, endMin: startMin + dur,
  };
}

const TK_RANDEVU: Placed[] = [
  tk("1", 0, "Sevgi Uçar", "Cilt bakımı", "09:00", 60, "completed"),
  tk("2", 0, "Zeynep Arslan", "Cilt bakımı", "10:30", 60, "arrived"),
  tk("3", 0, "Oya Sezer", "Kaş tasarımı", "10:45", 30, "planned"),
  tk("4", 0, "Hakan Tunç", "Danışma", "11:00", 45, "planned"),
  tk("5", 1, "Pınar Ateş", "Lazer", "09:30", 45, "completed"),
  tk("6", 1, "Damla Şen", "Lazer", "11:00", 45, "planned"),
  tk("7", 1, "Ece Yalın", "Lazer", "14:00", 15, "planned"),
  tk("8", 2, "Kemal Yurt", "Medikal masaj", "09:30", 60, "no_show"),
  tk("9", 2, "Serkan Bulut", "Medikal masaj", "11:30", 60, "planned"),
  tk("10", 2, "Ahmet Kurt", "Medikal masaj", "15:00", 60, "cancelled"),
  tk("11", 3, "Tuğba Erol", "Reformer pilates", "10:00", 50, "no_show"),
  tk("12", 3, "İrem Kara", "Reformer pilates", "12:00", 45, "planned"),
  tk("13", 4, "Murat Eren", "Saç kesimi", "13:00", 30, "planned"),
];

function TakvimOrnek() {
  const [sel, setSel] = React.useState<string | null>(null);
  const columns: GridColumn[] = TK_PERSONEL.map((ad, i) => {
    const items = TK_RANDEVU.filter((a) => a.staff_member_id === `p${i}`);
    return {
      key: `p${i}`,
      dayKey: "2026-11-05",
      label: ad,
      header: (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={ad} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] leading-4 font-semibold">{ad}</p>
            <p className="truncate text-[0.75rem] leading-4 text-label-2">{items.length} randevu</p>
          </div>
        </div>
      ),
      items,
      // Deniz öğleden sonra çalışır; Elif 13:00–15:00 izinli
      off: i === 4 ? [[540, 720]] : i === 3 ? [[780, 900]] : [[1080, 1140]],
      notes: i === 3 ? [{ at: 780, text: "İzinli" }] : undefined,
      isToday: true,
    };
  });
  return (
    <Section
      id="takvim"
      title="Takvim"
      note="Randevu bloğu ve zaman ızgarası (Takvim sayfası, Genel Bakış çizelgesi). Sıradaki randevu dolu Indigo (highlight). Çakışan bloklar yan yana sığar; mesai dışı ve izin soluk; kırmızı çizgi şu an. Çok sütun sığmazsa ızgara kendi içinde yatay kayar. Örnek veridir."
      wide
    >
      <Demo label="Blok yoğunlukları">
        <Row className="items-start">
          {(["planned", "arrived", "completed", "no_show", "cancelled"] as const).map((st) => (
            <AppointmentBlock
              key={st}
              status={st}
              title="Zeynep Arslan"
              detail="10:30–11:30 · Cilt bakımı"
              aside="MK"
              className="h-[52px] w-44"
            />
          ))}
        </Row>
        <Row>
          <AppointmentBlock status="planned" highlight title="Hakan Tunç" detail="11:00–11:45 · Danışma" aside="MK" className="h-[52px] w-44" />
          <AppointmentBlock status="planned" density="compact" title="Oya Sezer" detail="10:45" className="h-7 w-44" />
          <AppointmentBlock status="arrived" density="tiny" title="11:00 Damla Şen" className="h-5 w-36" />
        </Row>
      </Demo>
      <TimeGrid
        columns={columns}
        hours={[9, 19]}
        nowMin={11 * 60 + 20}
        fitViewport
        selectedId={sel}
        onOpen={(a) => setSel((s) => (s === a.id ? null : a.id))}
        scrollKey="vitrin"
        ariaLabel="Örnek gün — personele göre randevular"
      />
      <Legend />
    </Section>
  );
}

/* ------------------------------- Sayfa -------------------------------- */

export function VitrinView() {
  const [mode, setMode] = React.useState<Mode>("tek");
  const [q, setQ] = React.useState("");

  return (
    <ModeCtx.Provider value={mode}>
      <div className="space-y-10">
        <PageHeader
          eyebrow="Tasarım sistemi · E+F"
          title="Bileşen vitrini"
          description="Yalnızca geliştirmede açılır. Her bileşen, durumları ve boş, yükleniyor, hata halleri. Örnek veridir."
          context={
            <SegmentedControl
              aria-label="Önizleme"
              items={[
                { value: "tek", label: "Sayfa teması" },
                { value: "yan", label: "Açık ve koyu" },
              ]}
              value={mode}
              onValueChange={setMode}
              fullWidth
              className="md:w-auto"
            />
          }
          search={<SearchField variant="glass" value={q} onValueChange={setQ} placeholder="Vitrinde ara" className="w-[13.75rem] lg:w-[16.25rem]" />}
          secondary={<ToolbarAction icon={Banknote} label="Ödeme al" onClick={() => toast.info("Örnek: ödeme formu açılır")} />}
          primary={
            <ToolbarAction prominent icon={Plus} label="Yeni randevu" onClick={() => toast.info("Örnek: randevu formu açılır")} />
          }
        />

        <nav aria-label="Bölümler" className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {[
            ["dugmeler", "Düğmeler"],
            ["segment", "Segment"],
            ["arama", "Arama ve filtre"],
            ["baslik", "Sayfa başlığı"],
            ["kpi", "KPI şeridi"],
            ["grafik", "Grafik"],
            ["kucuk", "Küçük bileşenler"],
            ["liste", "Liste"],
            ["tablo", "Tablo"],
            ["form", "Form"],
            ["geldi", "Geldi"],
            ["takvim", "Takvim"],
            ["kaydirma", "Kaydırarak işlem"],
            ["katman", "Sayfa ve menü"],
            ["durumlar", "Boş, yükleniyor, hata"],
            ["roller", "Rol menüleri"],
          ].map(([id, l]) => (
            <a
              key={id}
              href={`#${id}`}
              className="inline-flex h-8 shrink-0 items-center rounded-full bg-fill px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-label hover:bg-fill-2"
            >
              {l}
            </a>
          ))}
        </nav>

        <Buttons />
        <Segments />
        <SearchAndFilter />
        <Headers />
        <Kpis />
        <Charts />
        <Smalls />
        <Lists />
        <Table />
        <Forms />
        <Geldi />
        <TakvimOrnek />
        <Swipe />
        <Layers />
        <States />
        <Roles />
      </div>
    </ModeCtx.Provider>
  );
}

/* ------------------------------ Bölümler ------------------------------ */

function Buttons() {
  return (
    <Section
      id="dugmeler"
      title="Düğmeler"
      note="Kapsül; basınca anında küçülür, bırakınca yayla geri gelir. Bir ekranda tek prominent düğme (araç çubuğunda). Eski adlar (default, outline, ghost) çalışmaya devam eder."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo label="Varyantlar">
          <Row>
            <Button variant="prominent">
              <Plus />
              Yeni randevu
            </Button>
            <Button variant="secondary">İkincil</Button>
            <Button variant="tinted">
              <Banknote />
              Ödeme al
            </Button>
            <Button variant="plain">Tümünü gör</Button>
            <Button variant="ghost">Nötr</Button>
            <Button variant="destructive">
              <Trash2 />
              Sil
            </Button>
            <Button variant="destructive-solid">Kalıcı sil</Button>
            <Button variant="link">Bağlantı</Button>
          </Row>
        </Demo>
        <Demo label="Boyutlar ve durumlar">
          <Row>
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button>default</Button>
            <Button size="lg">lg (44px)</Button>
            <Button disabled>Devre dışı</Button>
            <Button variant="secondary" size="icon" aria-label="Diğer">
              <MoreHorizontal />
            </Button>
          </Row>
        </Demo>
        <Demo label="Araç çubuğu düğmesi" className="md:col-span-2">
          <Row>
            <ToolbarAction prominent icon={Plus} label="Yeni randevu" onClick={() => {}} />
            <ToolbarAction icon={Banknote} label="Ödeme al" mobile="icon" onClick={() => {}} />
            <ToolbarAction icon={ListFilter} label="Filtrele" mobile="icon" badge={2} onClick={() => {}} />
          </Row>
          <p className="text-subhead text-label-2">
            ToolbarAction: telefonda birincil eylem 44px cam daireye döner; ikincil eylem
            varsayılan olarak gizlenir, mobile=&quot;icon&quot; verilirse simge olur.
          </p>
        </Demo>
      </div>
    </Section>
  );
}

function Segments() {
  const [view, setView] = React.useState("liste");
  const [donem, setDonem] = React.useState("ay");
  const [scope, setScope] = React.useState("aktif");
  return (
    <Section
      id="segment"
      title="Segment denetimi"
      note="Başparmak seçili düğmenin konumuna ve genişliğine yayla kayar; sürüklenebilir (uçlarda lastik bant). Klavye: ← → Home End."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo label="Eşit olmayan etiketler">
          <Row>
          <SegmentedControl
            aria-label="Görünüm"
            size="sm"
            items={[
              { value: "liste", label: "Liste" },
              { value: "cizelge", label: "Çizelge" },
            ]}
            value={view}
            onValueChange={setView}
          />
          <SegmentedControl
            aria-label="Dönem"
            items={[
              { value: "gun", label: "Bugün" },
              { value: "hafta", label: "Bu Hafta" },
              { value: "ay", label: "Bu Ay" },
              { value: "yil", label: "Bu Yıl" },
            ]}
            value={donem}
            onValueChange={setDonem}
          />
          </Row>
        </Demo>
        <Demo label="Sayılı, tam genişlik (kapsam)">
          <SegmentedControl
            aria-label="Kapsam"
            fullWidth
            items={[
              { value: "aktif", label: "Aktif", count: 1142 },
              { value: "pasif", label: "Pasif", count: 96 },
              { value: "arsiv", label: "Arşiv", count: 46 },
            ]}
            value={scope}
            onValueChange={setScope}
          />
        </Demo>
      </div>
    </Section>
  );
}

function SearchAndFilter() {
  const [q, setQ] = React.useState("");
  const [scope, setScope] = React.useState<"aktif" | "pasif" | "arsiv">("aktif");
  const [tokens, setTokens] = React.useState([
    { key: "hizmet", label: "Lazer Epilasyon", title: "Hizmet: Lazer Epilasyon" },
    { key: "borc", label: "Gecikmiş borcu olan", title: "Ödeme: Gecikmiş borcu olan" },
  ]);
  return (
    <Section
      id="arama"
      title="Arama alanı ve filtre satırı"
      note="Her listede aynı yerde: solda kapsam, sağda sonuç sayısı; altında etkin filtre jetonları. Telefonda jetonlar yatay kayan tek satırdır."
    >
      <div className="space-y-4">
        <Demo label="Arama alanı">
          <div className="grid gap-3 md:grid-cols-2">
            <SearchField value={q} onValueChange={setQ} placeholder="Ad, telefon veya e-posta" />
            <SearchField
              variant="glass"
              value=""
              onValueChange={() => {}}
              placeholder="Ara"
              tokens={<FilterToken label="VIP" title="Etiket: VIP" onRemove={() => {}} />}
            />
          </div>
        </Demo>
        <Demo label="Filtre satırı">
          <FilterBar
            scope={{
              "aria-label": "Müşteri kapsamı",
              value: scope,
              onValueChange: setScope,
              items: [
                { value: "aktif", label: "Aktif", count: 1142 },
                { value: "pasif", label: "Pasif", count: 96 },
                { value: "arsiv", label: "Arşiv", count: 46 },
              ],
            }}
            tokens={tokens.map((t) => ({ ...t, onRemove: () => setTokens((ts) => ts.filter((x) => x.key !== t.key)) }))}
            onClearAll={() => setTokens([])}
            result={`${tokens.length ? 12 : 1142} müşteri`}
            actions={<Button variant="plain" size="sm">Seç</Button>}
          />
        </Demo>
      </div>
    </Section>
  );
}

function Kpis() {
  return (
    <Section
      id="kpi"
      title="KPI şeridi"
      note="Etiket ›, değer, yüzde hapı ya da kırmızı uyarı, bağlam. Telefonda ve orta genişlikte 2×2; hiçbir satır iki satıra kırılmaz, bağlam sığmazsa kısalır."
      wide
    >
      <div className="space-y-4">
        <MetricStrip aria-label="Bu ayın özeti">
          <Metric label="Ciro" href="#kpi" value="₺41.850" delta={12} context="geçen ay aynı döneme göre" sparkline={CIRO_14} sparklineTitle="Son 14 gün" />
          <Metric label="Randevu" href="#kpi" value="64" delta={8} context="geçen ay aynı döneme göre" />
          <Metric label="Yeni müşteri" href="#kpi" value="18" delta={-5} context="geçen ay aynı döneme göre" />
          <Metric label="Açık borç" href="#kpi" value="₺23.400" tone="danger" flag="3 gecikmiş" context="9 müşteri" />
        </MetricStrip>
        <MetricStrip aria-label="Üç gösterge">
          <Metric label="Seans" value="52" delta={8} context="bu ay" />
          <Metric label="Gelmedi" value="3" delta={-40} invertDelta context="geçen aya göre" />
          <Metric label="Doluluk" value="%78" context="bu hafta" />
        </MetricStrip>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Eski StatCard" value="₺12.400" delta={4} comparison="geçen aya göre" href="#kpi" />
          <StatCard label="Uyarılı" value="₺3.000" accent="text-danger" sub="2 borçlu müşteri" hint="Açıklama" />
        </div>
      </div>
    </Section>
  );
}

function Smalls() {
  return (
    <Section id="kucuk" title="Küçük bileşenler" note="Renk yalnızca anlam taşır ve her zaman bir simge ya da metinle birliktedir.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Demo label="Yüzde hapı · Çizgi grafik">
          <Row>
            <DeltaPill value={12} />
            <DeltaPill value={-5} />
            <DeltaPill value={-40} invert />
            <Sparkline data={CIRO_14} />
          </Row>
        </Demo>
        <Demo label="Durum noktası · müşteri">
          <Row>
            <StatusDot variant="positive">Aktif</StatusDot>
            <StatusDot variant="info">Yeni</StatusDot>
            <StatusDot variant="neutral">Pasif</StatusDot>
            <StatusDot variant="warning">Beklemede</StatusDot>
            <StatusDot variant="danger">Engelli</StatusDot>
          </Row>
        </Demo>
        <Demo label="Durum etiketi · randevu">
          <Row>
            <StatusBadge variant="positive">Geldi</StatusBadge>
            <StatusBadge variant="secondary" icon={StatusIcons.done}>Tamamlandı</StatusBadge>
            <StatusBadge variant="info">Planlandı</StatusBadge>
            <StatusBadge variant="danger">Gelmedi</StatusBadge>
            <StatusBadge variant="secondary" icon={StatusIcons.cancelled}>İptal</StatusBadge>
          </Row>
        </Demo>
        <Demo label="Paket ilerlemesi">
          <div className="grid grid-cols-2 gap-4">
            <PackageProgress label="Reformer Pilates" used={3} total={12} />
            <PackageProgress label="Lazer Epilasyon" used={7} total={8} />
            <PackageProgress label="Medikal Masaj" used={6} total={6} />
            <PackageProgress label="Danışmanlık" used={1} total={1} />
          </div>
        </Demo>
        <Demo label="Tutar">
          <Row>
            <Money amount={41850} />
            <Money amount={2000} tone="debt" suffix="açık borç" />
            <Money amount={3000} overdue suffix="gecikmiş borç" />
            <Money amount={1250.5} tone="muted" />
          </Row>
        </Demo>
        <Demo label="Monogram · Rozet">
          <Row>
            <Avatar name="Zeynep Arslan" size="xs" />
            <Avatar name="Zeynep Arslan" size="sm" />
            <Avatar name="Hakan Tunç" />
            <Avatar name="İrem Kara" size="lg" />
            <Avatar name="Derya Koç" size="xl" />
          </Row>
          <Row>
            <Badge variant="tag">VIP</Badge>
            <Badge variant="tag">Taksitli</Badge>
            <Badge variant="positive">Ödendi</Badge>
            <Badge variant="warning">Kısmi</Badge>
            <Badge variant="danger">Ödenmedi</Badge>
            <Badge variant="info">Yeni</Badge>
            <Badge variant="secondary">Nötr</Badge>
          </Row>
        </Demo>
      </div>
    </Section>
  );
}

function Lists() {
  const [sel, setSel] = React.useState("1");
  return (
    <Section id="liste" title="Gruplanmış liste" note="Ayırıcı metnin başladığı yerden başlar. Başlık zeminde, grup opak ve kenarsız. Satırlar en az 52px.">
      <div className="grid gap-6 lg:grid-cols-2">
        <ListGroup
          title="Açık borç"
          detail="9 müşteri"
          action={<Money amount={23400} tone="debt" />}
          inset={64}
          footer={
            <>
              <span className="truncate">4 müşteri daha · ₺4.800</span>
              <Button variant="plain" size="sm" className="-mr-2">Cari Hesap</Button>
            </>
          }
        >
          <ListRow leading={<Avatar name="Oya Sezer" />} title="Oya Sezer" meta={<StatusBadge variant="danger">Gecikmiş</StatusBadge>} trailing={<Money amount={5600} tone="debt" />} href="#liste" />
          <ListRow leading={<Avatar name="Hakan Tunç" />} title="Hakan Tunç" trailing={<Money amount={4200} tone="debt" />} href="#liste" />
          <ListRow leading={<Avatar name="Murat Eren" />} title="Murat Eren" meta={<StatusBadge variant="danger">Gecikmiş</StatusBadge>} trailing={<Money amount={3800} tone="debt" />} href="#liste" />
        </ListGroup>
        <ListGroup title="Seçilebilir satırlar" detail="onClick + selected" inset={64}>
          {MUSTERILER.slice(0, 4).map((m) => (
            <ListRow
              key={m.id}
              leading={<Avatar name={m.ad} />}
              title={m.ad}
              subtitle={`${m.hizmet} · ${m.toplam - m.kullanilan} seans kaldı`}
              trailing={<StatusDot variant={DURUM_VARIANT[m.durum]}>{m.durum}</StatusDot>}
              onClick={() => setSel(m.id)}
              selected={sel === m.id}
            />
          ))}
        </ListGroup>
      </div>
    </Section>
  );
}

function Table() {
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [active, setActive] = React.useState<string | null>("1");
  const [empty, setEmpty] = React.useState(false);
  const columns: DataTableColumn<Musteri>[] = [
    {
      key: "ad",
      header: "Müşteri",
      sortValue: (m) => m.ad,
      cell: (m) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={m.ad} size="sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{m.ad}</span>
              {m.etiket && <Badge variant="tag">{m.etiket}</Badge>}
            </span>
            <span className="block text-[0.75rem] text-label-2 tabular-nums">{m.tel}</span>
          </span>
        </span>
      ),
    },
    { key: "paket", header: "Paket", cell: (m) => <PackageProgress label={m.hizmet} used={m.kullanilan} total={m.toplam} className="min-w-[8rem]" />, hideBelow: "@2xl" },
    {
      key: "sonraki",
      header: "Sıradaki randevu",
      hideBelow: "@3xl",
      cell: (m) =>
        m.sonraki ? (
          <span>
            <span className="block">{m.sonraki}</span>
            <span className="block text-[0.75rem] text-label-2">{m.uzman}</span>
          </span>
        ) : (
          <span className="text-label-2">Randevu yok</span>
        ),
    },
    { key: "durum", header: "Durum", hideBelow: "@4xl", cell: (m) => <StatusDot variant={DURUM_VARIANT[m.durum]}>{m.durum}</StatusDot> },
    {
      key: "deger",
      header: "Değer",
      align: "right",
      sortValue: (m) => m.deger,
      cell: (m) => (
        <span>
          <Money amount={m.deger} className="block" />
          {m.borc > 0 && <Money amount={m.borc} tone="debt" suffix={m.gecikmis ? "gecikmiş" : "borç"} className="text-[0.75rem]" />}
        </span>
      ),
    },
  ];
  return (
    <Section
      id="tablo"
      title="Veri tablosu"
      note="Sıralama (başlığa tıkla), seçim (onay kutusu, x tuşu), açık satır Indigo dolgu, başlık araç çubuğunun altında yapışık. Telefonda liste satırlarına dönüşür: ayırıcı metinden başlar (mobileInset), sola kaydırınca Ara · Ödeme al (mobileSwipe). Klavye: ↑ ↓ Enter."
      wide
    >
      <div className="space-y-3">
        <Row>
          <Button variant="secondary" size="sm" onClick={() => setEmpty((e) => !e)}>
            {empty ? "Veriyi göster" : "Boş hali göster"}
          </Button>
          {picked.size > 0 && <span className="text-subhead text-label-2">{picked.size} seçili</span>}
        </Row>
        <DataTable
          caption="Müşteriler"
          columns={columns}
          rows={empty ? [] : MUSTERILER}
          getRowId={(m) => m.id}
          defaultSort={{ key: "ad", dir: "asc" }}
          selectable
          selectedIds={picked}
          onSelectedIdsChange={setPicked}
          activeId={active}
          onRowActivate={(m) => setActive(m.id)}
          mobileInset={72}
          mobileSwipe={(m) => ({
            trailing: [
              { label: "Ara", icon: Phone, tone: "neutral", onAction: () => toast.info(`Örnek: ${m.ad} aranır`) },
              { label: "Ödeme al", icon: Banknote, tone: "primary", onAction: () => toast.info("Örnek: ödeme formu") },
            ],
          })}
          renderMobileRow={(m) => (
            <button
              type="button"
              onClick={() => setActive(m.id)}
              className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-hover active:bg-press focus-visible:outline-offset-[-3px]"
            >
              <Avatar name={m.ad} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2.5">
                  <span className="flex min-w-0 items-center gap-1.5 text-[1rem] font-semibold">
                    <span className="truncate">{m.ad}</span>
                    {m.etiket && <Badge variant="tag">{m.etiket}</Badge>}
                  </span>
                  <Money amount={m.deger} className="text-[0.9375rem]" />
                </span>
                <span className="block truncate text-[0.875rem] text-label-2">
                  {m.hizmet} · {m.toplam - m.kullanilan} seans kaldı
                </span>
                {m.borc > 0 && (
                  <Money amount={m.borc} overdue={m.gecikmis} tone="debt" suffix={m.gecikmis ? "gecikmiş borç" : "açık borç"} className="text-[0.875rem]" />
                )}
              </span>
            </button>
          )}
          empty={
            <EmptyState
              variant="inline"
              icon={Users}
              title="Bu filtreye uyan müşteri yok"
              description="Filtreleri temizleyin ya da yeni müşteri ekleyin."
              action={<Button variant="secondary" onClick={() => setEmpty(false)}>Filtreleri temizle</Button>}
            />
          }
          footer={<span>{MUSTERILER.length} müşteri</span>}
        />
      </div>
    </Section>
  );
}

/* Son 6 ay (bu ay sürüyor) ve son 14 gün — örnek veri */
const AYLIK: TrendPoint[] = [
  { label: "Haz", hint: "Haziran 2026", value: 38200 },
  { label: "Tem", hint: "Temmuz 2026", value: 41750 },
  { label: "Ağu", hint: "Ağustos 2026", value: 35900 },
  { label: "Eyl", hint: "Eylül 2026", value: 47300 },
  { label: "Eki", hint: "Ekim 2026", value: 52800 },
  { label: "Kas", hint: "Kasım 2026", value: 18450, partial: true },
];
const GUNLUK: TrendPoint[] = CIRO_14.map((v, i) => {
  const d = new Date(2026, 9, 24 + i);
  return {
    label: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    hint: d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" }),
    value: v,
    partial: i === CIRO_14.length - 1,
  };
});
const ON_IKI_AY: TrendPoint[] = ["Ara", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas"].map((l, i) => ({
  label: l,
  value: [21, 24, 26, 25, 29, 31, 33, 36, 34, 38, 41, 43][i],
}));
const GECEN_YIL = [18, 19, 22, 23, 22, 26, 27, 29, 30, 31, 33, 35];

function Charts() {
  const [kind, setKind] = React.useState<"line" | "bar">("bar");
  const [range, setRange] = React.useState<"6ay" | "14gun">("6ay");
  const data = range === "6ay" ? AYLIK : GUNLUK;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Section
      id="grafik"
      title="Grafik"
      note="TrendChart: Ciro sparkline'ının büyüğü. Tek eksen, sıfır taban, kılcal ızgara, etiketler tek satır (sığmazsa seyrekleşir). Üzerine gelin, dokunun ya da odaklanıp ← → kullanın. Süren dönem soluk sütun / kesik son çizgi."
      wide
    >
      <div className="grid gap-x-5 gap-y-8 lg:grid-cols-2">
        <section aria-labelledby="g-satis" className="min-w-0">
          <div className="mx-1 mb-2 flex min-w-0 items-center gap-2.5">
            <h3 id="g-satis" className="section-title shrink-0 whitespace-nowrap">Satışlar</h3>
            <span className="min-w-0 truncate text-subhead text-label-2w">
              {range === "6ay" ? "Son 6 ay" : "Son 14 gün"} · toplam <Money amount={total} />
            </span>
          </div>
          <div className="surface space-y-3 p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                aria-label="Dönem"
                size="sm"
                items={[
                  { value: "6ay", label: "6 ay" },
                  { value: "14gun", label: "14 gün" },
                ]}
                value={range}
                onValueChange={setRange}
              />
              <SegmentedControl
                aria-label="Grafik türü"
                size="sm"
                items={[
                  { value: "bar", label: "Sütun" },
                  { value: "line", label: "Çizgi" },
                ]}
                value={kind}
                onValueChange={setKind}
              />
            </div>
            <TrendChart
              key={range}
              data={data}
              kind={kind}
              unit="money"
              label={range === "6ay" ? "Son 6 ay satış" : "Son 14 gün satış"}
              seriesName="Satış"
            />
          </div>
        </section>

        <section aria-labelledby="g-rapor" className="min-w-0">
          <div className="mx-1 mb-2 flex min-w-0 items-center gap-2.5">
            <h3 id="g-rapor" className="section-title shrink-0 whitespace-nowrap">Seans</h3>
            <span className="min-w-0 truncate text-subhead text-label-2w">Son 12 ay · geçen yılla</span>
          </div>
          <div className="surface p-4 md:p-5">
            <TrendChart
              data={ON_IKI_AY}
              label="Son 12 ay seans sayısı, geçen yılla karşılaştırma"
              seriesName="Bu yıl"
              compare={{ name: "Geçen yıl", values: GECEN_YIL }}
            />
          </div>
        </section>

        <section aria-labelledby="g-bos" className="min-w-0">
          <div className="mx-1 mb-2 flex min-w-0 items-center gap-2.5">
            <h3 id="g-bos" className="section-title shrink-0 whitespace-nowrap">Boş hali</h3>
            <span className="min-w-0 truncate text-subhead text-label-2w">Veri yokken grafik çizilmez</span>
          </div>
          <EmptyState icon={TrendingUp} title="Henüz satış yok" description="Ödeme aldıkça son 6 ayın satışı burada görünür." />
        </section>

        <section aria-labelledby="g-kucuk" className="min-w-0">
          <div className="mx-1 mb-2 flex min-w-0 items-center gap-2.5">
            <h3 id="g-kucuk" className="section-title shrink-0 whitespace-nowrap">Eksensiz</h3>
            <span className="min-w-0 truncate text-subhead text-label-2w">showAxis=false · 140px</span>
          </div>
          <div className="surface p-4 md:p-5">
            <TrendChart data={GUNLUK} unit="money" label="Son 14 gün ciro" seriesName="Ciro" height={140} showAxis={false} />
          </div>
        </section>
      </div>
    </Section>
  );
}

function Headers() {
  return (
    <Section
      id="baslik"
      title="Sayfa başlığı"
      note="PageHeader: eyebrow, büyük başlık (tek satır), açıklama, context. leading başlığın soluna Avatar ya da geri bağlantısı koyar; başlık satırıyla ortalanır. Eylemler araç çubuğundadır (bu önizlemede yalıtıldı)."
      wide
    >
      <ToolbarIsolation>
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo label="leading · Avatar">
            <PageHeader
              eyebrow={
                <a href="#baslik" className="focus-ring inline-flex items-center gap-0.5 rounded">
                  <ChevronLeft aria-hidden className="size-3.5" />
                  Müşteriler
                </a>
              }
              leading={<Avatar name="Zeynep Arslan" size="lg" />}
              title="Zeynep Arslan"
              description="Müşteri · 14 randevu"
            />
          </Demo>
          <Demo label="leading · geri düğmesi">
            <PageHeader
              leading={
                <Button asChild variant="secondary" size="icon" aria-label="Ayarlar'a dön" className="rounded-full">
                  <a href="#baslik">
                    <ChevronLeft />
                  </a>
                </Button>
              }
              title="Çalışma saatleri"
              description="Ayarlar"
            />
          </Demo>
        </div>
      </ToolbarIsolation>
    </Section>
  );
}

function Forms() {
  const [on, setOn] = React.useState(true);
  const [off, setOff] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  return (
    <Section
      id="form"
      title="Form parçaları"
      note="FormSheet: telefonda alt sayfa, masaüstünde sağ panel; başlık, açıklama, gövde, alt eylemler. Form düğmeleri FormActions ile en altta, birincil en sağda. Gelişmiş seçenekler Disclosure içinde kapalı başlar. Anahtar 44px dokunma hedefi."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo label="Anahtar (Switch)">
          <div className="surface-flat flex items-center justify-between gap-3 py-1 pr-1 pl-4">
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-medium">Randevu linki açık</p>
              <p className="truncate text-subhead text-label-2">Müşteriler kendi randevusunu alır.</p>
            </div>
            <Switch checked={on} onCheckedChange={setOn} label="Randevu linki açık" />
          </div>
          <Row>
            <Switch checked={off} onCheckedChange={setOff} label="Örnek kapalı anahtar" />
            <Switch checked disabled onCheckedChange={() => {}} label="Örnek devre dışı açık anahtar" />
            <Switch checked={false} disabled onCheckedChange={() => {}} label="Örnek devre dışı kapalı anahtar" />
          </Row>
        </Demo>
        <Demo label="Açılır bölüm (Disclosure)">
          <div className="space-y-1.5">
            <Label htmlFor="v-ad">Kural adı</Label>
            <Input id="v-ad" placeholder="Randevu hatırlatma" />
          </div>
          <Disclosure title="Gelişmiş">
            <Label htmlFor="v-gonderen">Gönderen adı</Label>
            <Input id="v-gonderen" placeholder="İşletme adı" />
            <p className="text-subhead text-label-2">Boş bırakırsanız işletme adı kullanılır.</p>
          </Disclosure>
        </Demo>
        <Demo label="Form paneli (FormSheet)" className="md:col-span-2">
          <Row>
            <Button variant="secondary" onClick={() => setFormOpen(true)}>Form paneli</Button>
            <Button variant="secondary" onClick={() => setDetailOpen(true)}>Alt eylemli panel (footer)</Button>
          </Row>
        </Demo>
      </div>

      <FormSheet open={formOpen} onOpenChange={setFormOpen} title="Yeni kural" description="Ne zaman ve ne yapılsın, seçin.">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setFormOpen(false);
            toast.success("Örnek: kural kuruldu");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="v-mesaj">Mesaj</Label>
            <Textarea id="v-mesaj" rows={4} placeholder="Merhaba {ad}, ..." />
          </div>
          <Disclosure title="Gelişmiş">
            <Label htmlFor="v-baslik">Kural adı</Label>
            <Input id="v-baslik" placeholder="Hatırlatma · WhatsApp" />
          </Disclosure>
          <FormActions start={<Button type="button" variant="destructive">Kuralı sil</Button>}>
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit">Kuralı kur</Button>
          </FormActions>
        </form>
      </FormSheet>

      <FormSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="WhatsApp mesajı"
        description="Zeynep Arslan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={() => setDetailOpen(false)}>
              <MessageCircle />
              WhatsApp’ta aç
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="v-wa">Mesaj</Label>
            <Textarea id="v-wa" rows={6} defaultValue="Merhaba Zeynep Hanım, paketinizde 2 seans kaldı. Yenilemek ister misiniz?" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <p key={i} className="text-[0.875rem] text-label-2">
              Uzun içerik satırı {i + 1}. Alt eylemler masaüstünde panelin dibine yapışır; telefonda içeriğin altında durur.
            </p>
          ))}
        </div>
      </FormSheet>
    </Section>
  );
}

function Geldi() {
  const [arrived, setArrived] = React.useState<Record<string, boolean>>({ c: true });
  const set = (k: string, v: boolean) => setArrived((a) => ({ ...a, [k]: v }));
  const arrive = (k: string, name: string) => {
    set(k, true);
    toastUndo(`${name} geldi`, () => set(k, false));
  };
  return (
    <Section id="geldi" title="Geldi" note="Dolgu basılan noktadan yayılır; tekrar basınca geri alınır. Bildirimde Geri al. İşlevi sayfa verir (onArrive / onUndo).">
      <div className="grid gap-4 md:grid-cols-2">
        <Demo label="Boyutlar">
          <Row>
            <GeldiButton size="sm" customerName="Damla Şen" arrived={!!arrived.a} onArrive={() => arrive("a", "Damla Şen")} onUndo={() => set("a", false)} />
            <GeldiButton customerName="Zeynep Arslan" arrived={!!arrived.b} onArrive={() => arrive("b", "Zeynep Arslan")} onUndo={() => set("b", false)} />
            <GeldiButton customerName="İrem Kara" arrived={!!arrived.c} onArrive={() => arrive("c", "İrem Kara")} onUndo={() => set("c", false)} />
          </Row>
          <GeldiButton size="lg" className="w-full" customerName="Serkan Bulut" arrived={!!arrived.d} onArrive={() => arrive("d", "Serkan Bulut")} onUndo={() => set("d", false)} />
        </Demo>
        <Demo label="Bildirimler">
          <Row>
            <Button variant="secondary" onClick={() => toast.success("Müşteri kaydedildi")}>Başarılı</Button>
            <Button variant="secondary" onClick={() => toast.error("Kaydedilemedi. Bağlantıyı kontrol edip tekrar deneyin.")}>Hata</Button>
            <Button variant="secondary" onClick={() => toastUndo("Zeynep Arslan geldi", () => toast("Geri alındı"))}>Geri alınabilir</Button>
          </Row>
        </Demo>
      </div>
    </Section>
  );
}

function Swipe() {
  const [done, setDone] = React.useState<Record<string, boolean>>({});
  return (
    <Section
      id="kaydirma"
      title="Kaydırarak işlem"
      note="Telefonda: sağa tam kaydırma Geldi, sola kaydırma Ara ve Ödeme al. Kaydırma tek yol değildir; aynı eylemler satırdaki düğmede de var."
    >
      <div className="surface overflow-clip">
        <ul className="inset-rows">
          {MUSTERILER.slice(0, 3).map((m, i) => (
            <li key={m.id}>
              <SwipeRow
                leading={done[m.id] ? undefined : { label: "Geldi", icon: UserCheck, tone: "positive", onAction: () => setDone((d) => ({ ...d, [m.id]: true })) }}
                trailing={[
                  { label: "Ara", icon: Phone, tone: "neutral", onAction: () => toast.info(`Örnek: ${m.ad} aranır`) },
                  { label: "Ödeme al", icon: Banknote, tone: "primary", onAction: () => toast.info("Örnek: ödeme formu") },
                ]}
              >
                <div className="flex min-h-[60px] items-center gap-3.5 px-4 py-2.5">
                  <span className="w-12 shrink-0">
                    <b className="block text-[0.9375rem] font-semibold tabular-nums">{["11:00", "11:30", "12:00"][i]}</b>
                    <span className="block text-[0.75rem] text-label-2 tabular-nums">{["11:45", "12:30", "12:45"][i]}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.ad}</span>
                    <span className="block truncate text-subhead text-label-2">{m.hizmet} · {m.uzman}</span>
                  </span>
                  <GeldiButton
                    size="sm"
                    customerName={m.ad}
                    arrived={!!done[m.id]}
                    onArrive={() => setDone((d) => ({ ...d, [m.id]: true }))}
                    onUndo={() => setDone((d) => ({ ...d, [m.id]: false }))}
                  />
                </div>
              </SwipeRow>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Layers() {
  return (
    <Section
      id="katman"
      title="Alt sayfa, sağ panel, açılır menü"
      note="Açılan öğe tetikleyicisinden gelir, aynı yoldan kapanır. Alt sayfa iki kademeli: tutamaçtan ya da başlıktan sürükleyin, aşağı fırlatınca kapanır. Sağ panel başlıktan sağa fırlatınca kapanır."
    >
      <Demo label="Katmanlar">
        <Row>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Alt sayfa (telefon) / sağ panel</Button>
            </SheetTrigger>
            <SheetContent side="auto">
              <SheetHeader>
                <SheetTitle>Zeynep Arslan</SheetTitle>
                <SheetDescription>Cilt Bakımı · 7/10 seans · Merve</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4">
                <MetricStrip>
                  <Metric label="Toplam ödeme" value="₺14.500" />
                  <Metric label="Açık borç" value="₺2.000" tone="danger" />
                </MetricStrip>
                <div className="space-y-1.5">
                  <Label htmlFor="v-not">Not</Label>
                  <Input id="v-not" placeholder="Kısa bir not yazın" />
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <p key={i} className="text-[0.875rem] text-label-2">
                    Uzun içerik satırı {i + 1}. Orta kademede içerik kaydırılınca sayfa tam boya açılır.
                  </p>
                ))}
              </div>
              <SheetFooter className="flex-row justify-end">
                <Button variant="secondary">Vazgeç</Button>
                <Button>Kaydet</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Her zaman alt sayfa</Button>
            </SheetTrigger>
            <SheetContent side="bottom" detents={[0.5, 0.9]}>
              <SheetHeader>
                <SheetTitle>Randevu</SheetTitle>
                <SheetDescription>10:30 · Cilt Bakımı</SheetDescription>
              </SheetHeader>
              <div className="flex gap-2 px-4 pb-4">
                <Button variant="secondary" size="lg" className="flex-1">
                  <Banknote />
                  Ödeme al
                </Button>
                <GeldiButton size="lg" className="flex-1" arrived={false} onArrive={() => {}} customerName="Zeynep Arslan" />
              </div>
            </SheetContent>
          </Sheet>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">
                <ListFilter />
                Açılır panel
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <p className="text-[0.9375rem] font-semibold">Filtre</p>
              <p className="mt-1 text-subhead text-label-2">Tetikleyicisinden büyür, aynı yoldan söner. Esc ya da dışarı tıklayınca kapanır.</p>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                <MoreHorizontal />
                Menü
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Randevu</DropdownMenuLabel>
              <DropdownMenuItem>
                <MessageCircle />
                WhatsApp&apos;tan hatırlat
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Phone />
                Ara
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <CalendarX2 />
                Randevuyu iptal et
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 />
                Onay penceresi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Müşteri silinsin mi?</DialogTitle>
                <DialogDescription>Derya Koç ve bütün randevu geçmişi silinir. Bu işlem geri alınamaz.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Vazgeç</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive-solid">Sil</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>
      </Demo>
    </Section>
  );
}

function States() {
  return (
    <Section id="durumlar" title="Boş, yükleniyor, hata" note="Çıkmaz yok: boş ekran ne yapılacağını söyler ve düğmesini sunar; hata ne olduğunu ve ne yapılacağını söyler.">
      <div className="grid gap-4 lg:grid-cols-2">
        <EmptyState
          icon={Users}
          title="Henüz müşteri yok"
          description="İlk müşterinizi ekleyin; randevu ve paketler burada görünür."
          action={
            <Button>
              <Plus />
              Yeni müşteri
            </Button>
          }
        />
        <ErrorState onRetry={() => toast.info("Örnek: yeniden denenir")} />
        <div className="space-y-4 lg:col-span-2">
          <PageHeaderSkeleton />
          <KpiRowSkeleton />
          <TableSkeleton rows={3} />
        </div>
      </div>
    </Section>
  );
}

function Roles() {
  return (
    <Section
      id="roller"
      title="Rol menüleri"
      note="Kenar çubuğu, telefon Menü sayfası, sekme çubuğu ve arama aynı süzgeci kullanır (navSectionsForRole). Rol göremediği sayfayı hiçbir yerde görmez."
      wide
    >
      <div className="grid gap-4 md:grid-cols-3">
        {(["owner", "reception", "specialist"] as const).map((role) => (
          <Demo key={role} label={ROLE_LABEL[role]}>
            <div>
              <p className="text-[0.75rem] font-semibold text-label-2">Telefon sekmeleri</p>
              <Row className="gap-1.5">
                {[...mobileTabsForRole(role).map((t) => t.label), "Menü"].map((l) => (
                  <Badge key={l} variant="secondary">{l}</Badge>
                ))}
              </Row>
            </div>
            {navSectionsForRole(role).map((s) => (
              <div key={s.key}>
                <p className="text-[0.75rem] font-semibold text-label-2">{s.label}</p>
                <Row className="gap-1.5">
                  {s.items.map((i) => (
                    <Badge key={i.href} variant="outline">{i.label}</Badge>
                  ))}
                </Row>
              </div>
            ))}
          </Demo>
        ))}
      </div>
    </Section>
  );
}
