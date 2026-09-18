"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  GripVertical,
  MoreHorizontal,
  Trash2,
  Palette,
  Eye,
  UserCheck,
  Phone,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Customer, PipelineStage } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { CustomerDetailSheet } from "../musteriler/customer-detail-sheet";

import {
  moveLeadToStage,
  createStage,
  renameStage,
  updateStageColor,
  deleteStage,
  reorderStages,
  convertLeadToCustomer,
} from "./actions";

type Staff = { id: string; full_name: string | null };

const SWATCHES = [
  "#3B82F6",
  "#F59E0B",
  "#5B5BD6",
  "#16A34A",
  "#E11D48",
  "#0EA5E9",
  "#8B5CF6",
  "#64748B",
];

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function LeadBoard({
  stages,
  leads,
  staff,
}: {
  stages: PipelineStage[];
  leads: Customer[];
  staff: Staff[];
}) {
  const router = useRouter();
  const [stageList, setStageList] = useState(stages);
  const [leadList, setLeadList] = useState(leads);

  // props değişince senkronla (ekleme/silme/taşıma sonrası router.refresh)
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

  const staffName = (id: string | null) =>
    id ? staff.find((s) => s.id === id)?.full_name ?? null : null;

  // dnd-kit: aktif sürüklenen öğe (kart veya sütun)
  const [activeDrag, setActiveDrag] = useState<
    { type: "card"; id: string } | { type: "column"; id: string } | null
  >(null);

  // Fare, dokunmatik ve klavye ile sürükleme (mobil dahil, erişilebilir)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(e: DragStartEvent) {
    const d = e.active.data.current as
      | { type: "card" | "column"; id: string }
      | undefined;
    if (d) setActiveDrag({ type: d.type, id: d.id });
  }

  function handleDragEnd(e: DragEndEvent) {
    const drag = activeDrag;
    setActiveDrag(null);
    if (!drag || !e.over) return;

    const overData = e.over.data.current as
      | { type: "column-drop" | "column"; stageId: string }
      | undefined;
    const toStageId = overData?.stageId ?? String(e.over.id);

    if (drag.type === "card") handleCardDrop(drag.id, toStageId);
    else handleColumnDrop(drag.id, toStageId);
  }

  const draggingCard =
    activeDrag?.type === "card"
      ? leadList.find((l) => l.id === activeDrag.id) ?? null
      : null;
  const draggingColumn =
    activeDrag?.type === "column"
      ? stageList.find((s) => s.id === activeDrag.id) ?? null
      : null;

  // Inline yeniden adlandırma
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Sütun silme / ekleme diyalogları
  const [deleteStageTarget, setDeleteStageTarget] =
    useState<PipelineStage | null>(null);
  const [reassignId, setReassignId] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [newColName, setNewColName] = useState("");

  // Kart detayı
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // ---- Kart taşıma ----
  async function handleCardDrop(cardId: string, toStageId: string) {
    const lead = leadList.find((l) => l.id === cardId);
    if (!lead || lead.pipeline_stage_id === toStageId) return;
    const fromStage = stageList.find((s) => s.id === lead.pipeline_stage_id);
    const toStage = stageList.find((s) => s.id === toStageId);

    setLeadList((prev) =>
      prev.map((l) =>
        l.id === cardId ? { ...l, pipeline_stage_id: toStageId } : l
      )
    );
    const res = await moveLeadToStage(
      cardId,
      toStageId,
      fromStage?.name ?? "?",
      toStage?.name ?? "?"
    );
    if (res.error) {
      toast.error(res.error);
      setLeadList(leads);
      return;
    }
    router.refresh();
  }

  // ---- Sütun sıralama ----
  async function handleColumnDrop(draggedId: string, targetId: string) {
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

  // ---- Rename ----
  async function commitEdit() {
    const id = editingId;
    const name = editName.trim();
    setEditingId(null);
    if (!id || !name) return;
    setStageList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
    const res = await renameStage(id, name);
    if (res.error) {
      toast.error(res.error);
      setStageList(stages);
    } else {
      router.refresh();
    }
  }

  // ---- Renk ----
  async function changeColor(stageId: string, color: string) {
    setStageList((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, color } : s))
    );
    const res = await updateStageColor(stageId, color);
    if (res.error) {
      toast.error(res.error);
      setStageList(stages);
    } else {
      router.refresh();
    }
  }

  // ---- Sütun sil ----
  async function confirmDelete() {
    if (!deleteStageTarget) return;
    const res = await deleteStage(deleteStageTarget.id, reassignId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Sütun silindi");
    setDeleteStageTarget(null);
    setReassignId("");
    router.refresh();
  }

  // ---- Sütun ekle ----
  async function confirmAdd() {
    const name = newColName.trim();
    const res = await createStage(name);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setAddOpen(false);
    setNewColName("");
    router.refresh();
  }

  // ---- Müşteriye dönüştür ----
  async function convert(cardId: string) {
    setLeadList((prev) => prev.filter((l) => l.id !== cardId));
    const res = await convertLeadToCustomer(cardId);
    if (res.error) {
      toast.error(res.error);
      setLeadList(leads);
      return;
    }
    toast.success("Müşteriye dönüştürüldü");
    router.refresh();
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stageList.map((stage) => {
          const colLeads = leadList.filter(
            (l) => l.pipeline_stage_id === stage.id
          );
          return (
            <BoardColumn
              key={stage.id}
              stage={stage}
              isDragging={activeDrag?.type === "column" && activeDrag.id === stage.id}
            >
              {/* Sütun başlığı */}
              <div
                className="flex items-center gap-1.5 rounded-t-xl border-b px-2 py-2"
                style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
              >
                <ColumnDragHandle stageId={stage.id} />

                {editingId === stage.id ? (
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-7 flex-1"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(stage.id);
                      setEditName(stage.name);
                    }}
                    className="flex-1 truncate text-left text-sm font-semibold"
                    title="Düzenlemek için tıkla"
                  >
                    {stage.name}
                  </button>
                )}

                <Badge variant="secondary">{colLeads.length}</Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Sütun işlemleri</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Palette className="size-4" />
                        Renk değiştir
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <div className="grid grid-cols-4 gap-1 p-1">
                          {SWATCHES.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => changeColor(stage.id, c)}
                              className="size-6 rounded-md border"
                              style={{ backgroundColor: c }}
                              aria-label={c}
                            />
                          ))}
                        </div>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={stageList.length <= 1}
                      onClick={() => {
                        setDeleteStageTarget(stage);
                        const other = stageList.find((s) => s.id !== stage.id);
                        setReassignId(other?.id ?? "");
                      }}
                    >
                      <Trash2 className="size-4" />
                      Sütunu sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Kartlar */}
              <div className="flex-1 space-y-2 p-2">
                {colLeads.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Buraya sürükleyin
                  </p>
                ) : (
                  colLeads.map((lead) => (
                    <SortableLeadCard key={lead.id} leadId={lead.id}>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/musteriler/${lead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium leading-tight hover:text-primary hover:underline"
                        >
                          {lead.full_name}
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">İşlemler</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDetailCustomer(lead)}
                            >
                              <Eye className="size-4" />
                              Detay
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => convert(lead.id)}>
                              <UserCheck className="size-4" />
                              Müşteriye dönüştür
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {lead.phone && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="size-3" />
                          {lead.phone}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {lead.source ? (
                          <Badge variant="outline">{lead.source}</Badge>
                        ) : (
                          <span />
                        )}
                        {staffName(lead.assigned_to) && (
                          <span
                            className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
                            title={staffName(lead.assigned_to) ?? ""}
                          >
                            {initials(staffName(lead.assigned_to))}
                          </span>
                        )}
                      </div>
                    </SortableLeadCard>
                  ))
                )}
              </div>
            </BoardColumn>
          );
        })}

        {/* Sütun ekle */}
        <div className="shrink-0">
          <Button
            variant="outline"
            className="h-10 w-72 justify-start gap-2 border-dashed"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            Sütun ekle
          </Button>
        </div>
      </div>

        {/* Sürüklenirken imlecin altında taşınan öğenin önizlemesi */}
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2,0,0,1)" }}>
          {draggingCard ? (
            <div className="w-72 rotate-2 rounded-lg border bg-card p-3 shadow-soft-lg">
              <p className="font-medium leading-tight">{draggingCard.full_name}</p>
              {draggingCard.phone && (
                <p className="mt-1 text-xs text-muted-foreground">{draggingCard.phone}</p>
              )}
            </div>
          ) : draggingColumn ? (
            <div className="w-72 rounded-xl border bg-card px-3 py-2 shadow-soft-lg">
              <p className="text-sm font-semibold">{draggingColumn.name}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Detay çekmecesi */}
      {detailCustomer && (
        <CustomerDetailSheet
          customer={detailCustomer}
          open={!!detailCustomer}
          onOpenChange={(o) => !o && setDetailCustomer(null)}
        />
      )}

      {/* Sütun ekle diyaloğu */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni sütun</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="Sütun adı (örn. Teklif Verildi)"
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmAdd();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              İptal
            </Button>
            <Button onClick={confirmAdd}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sütun sil diyaloğu */}
      <Dialog
        open={!!deleteStageTarget}
        onOpenChange={(o) => !o && setDeleteStageTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sütunu sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteStageTarget?.name}</strong> silinecek. İçindeki
              kartlar seçtiğin sütuna taşınacak.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Kartları şu sütuna taşı:
            </label>
            <Select value={reassignId} onValueChange={setReassignId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sütun seçin" />
              </SelectTrigger>
              <SelectContent>
                {stageList
                  .filter((s) => s.id !== deleteStageTarget?.id)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteStageTarget(null)}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!reassignId}
            >
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Sütun kabı: hem bırakma hedefi (kart buraya bırakılır) hem de
 * sıralanabilir öğe (sütunun kendisi taşınabilir).
 */
function BoardColumn({
  stage,
  isDragging,
  children,
}: {
  stage: PipelineStage;
  isDragging: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${stage.id}`,
    data: { type: "column-drop", stageId: stage.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors",
        isOver && "ring-2 ring-primary",
        isDragging && "opacity-60"
      )}
    >
      {children}
    </div>
  );
}

/** Sütunu taşımak için tutamak — dnd-kit sortable'a bağlı. */
function ColumnDragHandle({ stageId }: { stageId: string }) {
  const { setNodeRef, attributes, listeners, isDragging } = useSortable({
    id: `colhandle-${stageId}`,
    data: { type: "column", id: stageId, stageId },
  });

  return (
    <span
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title="Sürükleyerek sırala"
      className={cn(
        "cursor-grab touch-none text-muted-foreground active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <GripVertical className="size-4" />
      <span className="sr-only">Sütunu taşı</span>
    </span>
  );
}

/** Sürüklenebilir lead kartı. */
function SortableLeadCard({
  leadId,
  children,
}: {
  leadId: string;
  children: React.ReactNode;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${leadId}`,
    data: { type: "card", id: leadId },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "cursor-grab touch-none rounded-lg border bg-card p-3 shadow-soft transition-shadow active:cursor-grabbing",
        isDragging ? "opacity-40" : "hover:shadow-soft-lg"
      )}
    >
      {children}
    </div>
  );
}
