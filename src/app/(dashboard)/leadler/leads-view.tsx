"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Columns3, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { useUrlState } from "@/lib/use-url-state";
import type { Customer, PipelineStage } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastUndo } from "@/components/ui/sonner";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "../musteriler/customer-form";

import {
  convertLeadToCustomer,
  createStage,
  deleteStage,
  moveLeadToStage,
  renameStage,
  reorderStages,
} from "./actions";
import { LeadBoard } from "./lead-board";
import { LeadDetailSheet } from "./lead-detail-sheet";
import { LeadList } from "./lead-list";
import { matchesQuery, type Staff } from "./lead-types";

const VIEWS = [
  { value: "pano", label: "Pano" },
  { value: "liste", label: "Liste" },
] as const;

export function LeadsView({
  stages,
  leads,
  staff,
  loadFailed,
}: {
  stages: PipelineStage[];
  leads: Customer[];
  staff: Staff[];
  loadFailed: boolean;
}) {
  const router = useRouter();

  // Sunucudan gelen veri yenilenince yerel kopyayı eşitle
  const [stageList, setStageList] = useState(stages);
  const [leadList, setLeadList] = useState(leads);
  const [prevStages, setPrevStages] = useState(stages);
  const [prevLeads, setPrevLeads] = useState(leads);
  if (prevStages !== stages) {
    setPrevStages(stages);
    setStageList(stages);
  }
  if (prevLeads !== leads) {
    setPrevLeads(leads);
    setLeadList(leads);
  }

  // Görünüm ve filtreler URL'de
  const [viewRaw, setView] = useUrlState("gorunum", "pano");
  const view = viewRaw === "liste" ? "liste" : "pano";
  const [stageFilter, setStageFilter] = useUrlState("asama", "hepsi");
  const [qUrl, setQUrl] = useUrlState("q", "");
  const [q, setQ] = useState(qUrl);
  const qRef = useRef({ qUrl, setQUrl });
  useEffect(() => {
    qRef.current = { qUrl, setQUrl };
  });
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== qRef.current.qUrl) qRef.current.setQUrl(q);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const visible = useMemo(() => leadList.filter((l) => matchesQuery(l, q)), [leadList, q]);

  // "Yeni lead" komut paletinden ?yeni=1 ile de açılır.
  const yeniParam = useSearchParams().get("yeni");
  const [createOpenLocal, setCreateOpenLocal] = useState(false);
  const createOpen = createOpenLocal || yeniParam === "1";
  const setCreateOpen = (open: boolean) => {
    setCreateOpenLocal(open);
    // Sunucuya gitmeden adresten sil (router.replace sayfayı yeniden çizdirir).
    if (!open && yeniParam) {
      const sp = new URLSearchParams(window.location.search);
      sp.delete("yeni");
      const qs = sp.toString();
      window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
  };
  const [detail, setDetail] = useState<{ id: string; open: boolean } | null>(null);
  const [edit, setEdit] = useState<{ lead: Customer; open: boolean } | null>(null);
  const [convertTarget, setConvertTarget] = useState<Customer | null>(null);
  const [converting, setConverting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PipelineStage | null>(null);
  const [reassignId, setReassignId] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  const detailLead = detail ? (leadList.find((l) => l.id === detail.id) ?? null) : null;
  const staffName = (id: string | null) =>
    (id ? staff.find((s) => s.id === id)?.full_name : null) ?? null;

  // ---- Aşama değiştirme (geri alınabilir) ----
  async function moveLead(leadId: string, toStageId: string, silent = false) {
    const lead = leadList.find((l) => l.id === leadId);
    if (!lead) return;
    const fromId = lead.pipeline_stage_id ?? stageList[0]?.id ?? null;
    if (fromId === toStageId) return;
    const from = stageList.find((s) => s.id === fromId);
    const to = stageList.find((s) => s.id === toStageId);

    setLeadList((prev) => prev.map((l) => (l.id === leadId ? { ...l, pipeline_stage_id: toStageId } : l)));
    const res = await moveLeadToStage(leadId, toStageId, from?.name ?? "—", to?.name ?? "—");
    if (res.error) {
      toast.error(res.error);
      setLeadList((prev) => prev.map((l) => (l.id === leadId ? lead : l)));
      return;
    }
    router.refresh();
    if (!silent && fromId) {
      toastUndo(`${lead.full_name} · ${to?.name ?? ""}`, () => {
        void moveLead(leadId, fromId, true);
      });
    }
  }

  // ---- Müşteriye çevir ----
  async function confirmConvert() {
    if (!convertTarget) return;
    const lead = convertTarget;
    setConverting(true);
    const res = await convertLeadToCustomer(lead.id);
    setConverting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setConvertTarget(null);
    setDetail(null);
    setLeadList((prev) => prev.filter((l) => l.id !== lead.id));
    toast.success(`${lead.full_name} müşteriye çevrildi`, {
      action: { label: "Müşteriyi aç", onClick: () => router.push(`/musteriler/${lead.id}`) },
    });
    router.refresh();
  }

  // ---- Aşama yönetimi ----
  async function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const order = [...stageList];
    const from = order.findIndex((s) => s.id === draggedId);
    const to = order.findIndex((s) => s.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    setStageList(order);
    const res = await reorderStages(order.map((s) => s.id));
    if (res.error) {
      toast.error(res.error);
      setStageList(stages);
      return;
    }
    router.refresh();
  }

  async function rename(stageId: string, name: string) {
    setStageList((prev) => prev.map((s) => (s.id === stageId ? { ...s, name } : s)));
    const res = await renameStage(stageId, name);
    if (res.error) {
      toast.error(res.error);
      setStageList(stages);
      return;
    }
    toast.success("Aşama adı değişti");
    router.refresh();
  }

  async function confirmDeleteStage() {
    if (!deleteTarget) return;
    const res = await deleteStage(deleteTarget.id, reassignId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Aşama silindi");
    setDeleteTarget(null);
    setReassignId("");
    router.refresh();
  }

  async function confirmAddStage() {
    const name = newStageName.trim();
    if (!name) {
      toast.error("Aşamaya bir ad yazın.");
      return;
    }
    const res = await createStage(name);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Aşama eklendi");
    setAddOpen(false);
    setNewStageName("");
    router.refresh();
  }

  const header = (
    <PageHeader
      title="Lead'ler"
      description="Potansiyel müşterilerinizi aşama aşama takip edin; hazır olanı tek dokunuşla müşteriye çevirin."
      context={
        leadList.length > 0 ? (
          <SegmentedControl
            items={VIEWS}
            value={view}
            onValueChange={setView}
            aria-label="Görünüm"
            className="max-md:hidden"
          />
        ) : undefined
      }
      search={
        leadList.length > 0 ? (
          <SearchField
            variant="glass"
            value={q}
            onValueChange={setQ}
            placeholder="Lead ara"
            className="w-56"
          />
        ) : undefined
      }
      primary={
        <ToolbarAction prominent icon={Plus} label="Yeni lead" onClick={() => setCreateOpen(true)} />
      }
    />
  );

  let body: React.ReactNode;
  if (loadFailed) {
    body = <ErrorState title="Lead'ler yüklenemedi" onRetry={() => router.refresh()} />;
  } else if (stageList.length === 0) {
    body = (
      <EmptyState
        icon={Columns3}
        title="Henüz aşama yok"
        description="Lead'lerinizi takip etmek için önce bir aşama ekleyin (ör. Yeni, Görüşüldü, Teklif verildi)."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus />
            Aşama ekle
          </Button>
        }
      />
    );
  } else if (leadList.length === 0) {
    body = (
      <EmptyState
        icon={UserPlus}
        title="Henüz lead yok"
        description="Sizi arayan ya da yazan potansiyel müşterileri buraya ekleyin; her birini aşama aşama takip edebilirsiniz."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Yeni lead
          </Button>
        }
      />
    );
  } else {
    body = (
      <>
        <div className="md:hidden">
          <SearchField value={q} onValueChange={setQ} placeholder="Lead ara" size="lg" className="mb-4" />
        </div>
        <div className={view === "pano" ? "hidden md:block" : "hidden"}>
          <LeadBoard
            stages={stageList}
            leads={visible}
            staff={staff}
            onOpen={(l) => setDetail({ id: l.id, open: true })}
            onMove={(id, to) => void moveLead(id, to)}
            onReorder={(a, b) => void reorder(a, b)}
            onRename={(id, name) => void rename(id, name)}
            onAskDelete={(s) => {
              setDeleteTarget(s);
              setReassignId(stageList.find((x) => x.id !== s.id)?.id ?? "");
            }}
            onAddStage={() => setAddOpen(true)}
          />
        </div>
        <div className={view === "pano" ? "md:hidden" : ""}>
          <LeadList
            stages={stageList}
            leads={visible}
            stageFilter={stageFilter}
            onStageFilter={setStageFilter}
            onOpen={(l) => setDetail({ id: l.id, open: true })}
            searching={q.trim().length > 0}
          />
        </div>
      </>
    );
  }

  return (
    <div className="min-w-0 space-y-8">
      {header}
      {body}

      {/* Yeni lead */}
      <FormSheet open={createOpen} onOpenChange={setCreateOpen} title="Yeni lead">
        <CustomerForm
          asLead
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </FormSheet>

      {/* Lead ayrıntısı */}
      <LeadDetailSheet
        lead={detailLead}
        open={!!detail?.open && !!detailLead}
        onOpenChange={(o) => setDetail((d) => (d ? { ...d, open: o } : d))}
        stages={stageList}
        assignee={staffName(detailLead?.assigned_to ?? null)}
        onMove={(id, to) => void moveLead(id, to)}
        onEdit={(l) => {
          setDetail((d) => (d ? { ...d, open: false } : d));
          setEdit({ lead: l, open: true });
        }}
        onConvert={(l) => setConvertTarget(l)}
      />

      {/* Lead'i düzenle */}
      <FormSheet
        open={!!edit?.open}
        onOpenChange={(o) => setEdit((e) => (e ? { ...e, open: o } : e))}
        title="Lead'i düzenle"
        description={edit?.lead.full_name}
      >
        {edit && (
          <CustomerForm
            customer={edit.lead}
            onSuccess={() => {
              setEdit((e) => (e ? { ...e, open: false } : e));
              router.refresh();
            }}
            onCancel={() => setEdit((e) => (e ? { ...e, open: false } : e))}
          />
        )}
      </FormSheet>

      {/* Müşteriye çevir: onay */}
      <Dialog open={!!convertTarget} onOpenChange={(o) => !o && setConvertTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Müşteriye çevir</DialogTitle>
            <DialogDescription>
              {convertTarget?.full_name} lead listesinden çıkar ve Müşteriler’e eklenir. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConvertTarget(null)}>
              Vazgeç
            </Button>
            <Button onClick={confirmConvert} disabled={converting}>
              {converting ? "Çevriliyor..." : "Müşteriye çevir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aşama ekle */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Aşama ekle</DialogTitle>
            <DialogDescription>Yeni aşama panonun sonuna eklenir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="stage-name">Aşama adı</Label>
            <Input
              id="stage-name"
              autoFocus
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="Teklif verildi"
              onKeyDown={(e) => e.key === "Enter" && void confirmAddStage()}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={confirmAddStage}>Aşama ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aşamayı sil: onay */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Aşamayı sil</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name}” silinecek. İçindeki lead’ler seçtiğiniz aşamaya taşınır. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reassign">Lead’ler hangi aşamaya taşınsın?</Label>
            <Select value={reassignId} onValueChange={setReassignId}>
              <SelectTrigger id="reassign" className="w-full">
                <SelectValue placeholder="Aşama seçin" />
              </SelectTrigger>
              <SelectContent>
                {stageList
                  .filter((s) => s.id !== deleteTarget?.id)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive-solid" onClick={confirmDeleteStage} disabled={!reassignId}>
              Aşamayı sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
