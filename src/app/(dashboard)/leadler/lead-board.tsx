"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { motion } from "motion/react";
import { GripVertical, MoreHorizontal, Pencil, Phone, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMotionPreset } from "@/lib/motion";
import type { Customer, PipelineStage } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { stageIdOf, type Staff } from "./lead-types";

type Drag = { type: "card"; id: string } | { type: "column"; id: string };

/**
 * Lead panosu (masaüstü ve tablet): aşamalar sütun, lead'ler kart.
 * Kartı başka aşamaya, aşama başlığındaki tutamağı yeniden sıralamak için
 * sürükleyin. Klavyede: karta odaklanıp Boşluk ile alın, ok tuşlarıyla
 * taşıyın, Boşluk ile bırakın; Enter ayrıntıyı açar.
 * Pano genişse yalnızca kendi alanı içinde yatay kayar; sayfa taşmaz.
 */
export function LeadBoard({
  stages,
  leads,
  staff,
  onOpen,
  onMove,
  onReorder,
  onRename,
  onAskDelete,
  onAddStage,
}: {
  stages: PipelineStage[];
  leads: Customer[];
  staff: Staff[];
  onOpen: (lead: Customer) => void;
  onMove: (leadId: string, toStageId: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onRename: (stageId: string, name: string) => void;
  onAskDelete: (stage: PipelineStage) => void;
  onAddStage: () => void;
}) {
  const { reduce } = useMotionPreset();
  const [active, setActive] = useState<Drag | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  );

  const staffName = (id: string | null) =>
    (id ? staff.find((s) => s.id === id)?.full_name : null) ?? null;

  function onDragStart(e: DragStartEvent) {
    const d = e.active.data.current as Drag | undefined;
    if (d) setActive({ type: d.type, id: d.id });
  }

  function onDragEnd(e: DragEndEvent) {
    const drag = active;
    setActive(null);
    if (!drag || !e.over) return;
    const toStageId = (e.over.data.current as { stageId?: string } | undefined)?.stageId;
    if (!toStageId) return;
    if (drag.type === "card") onMove(drag.id, toStageId);
    else onReorder(drag.id, toStageId);
  }

  function commitRename(stage: PipelineStage) {
    const name = editName.trim();
    setEditingId(null);
    if (name && name !== stage.name) onRename(stage.id, name);
  }

  const draggingCard = active?.type === "card" ? leads.find((l) => l.id === active.id) : null;
  const draggingColumn = active?.type === "column" ? stages.find((s) => s.id === active.id) : null;

  return (
    <DndContext
      id="lead-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {/* Yalnızca bu alan yatay kayar; sayfa genişliği değişmez. */}
      <div
        role="region"
        aria-label="Lead panosu"
        tabIndex={0}
        className="focus-ring -mx-4 flex min-w-0 items-start gap-4 overflow-x-auto overscroll-x-contain px-4 pb-4 md:-mx-0 md:px-0"
      >
        {stages.map((stage) => {
          const colLeads = leads.filter((l) => stageIdOf(l, stages) === stage.id);
          return (
            <Column
              key={stage.id}
              stage={stage}
              dimmed={active?.type === "column" && active.id === stage.id}
            >
              <div className="flex items-center gap-1 px-2 pt-2.5 pb-1.5">
                <ColumnHandle stage={stage} />
                {editingId === stage.id ? (
                  <Input
                    autoFocus
                    aria-label="Aşama adı"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitRename(stage)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(stage);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-8 min-w-0 flex-1"
                  />
                ) : (
                  <h3 className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold" title={stage.name}>
                    {stage.name}
                  </h3>
                )}
                <Badge variant="secondary" aria-label={`${colLeads.length} lead`}>
                  {colLeads.length}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`${stage.name} aşama işlemleri`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingId(stage.id);
                        setEditName(stage.name);
                      }}
                    >
                      <Pencil />
                      Adı değiştir
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={stages.length <= 1}
                      onClick={() => onAskDelete(stage)}
                    >
                      <Trash2 />
                      Aşamayı sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <ul role="list" className="space-y-2 p-2 pt-1">
                {colLeads.length === 0 ? (
                  <li className="px-2 py-8 text-center text-subhead text-label-2">
                    Lead’i buraya sürükleyin
                  </li>
                ) : (
                  colLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      assignee={staffName(lead.assigned_to)}
                      onOpen={() => onOpen(lead)}
                    />
                  ))
                )}
              </ul>
            </Column>
          );
        })}

        <Button
          variant="secondary"
          className="h-11 w-72 shrink-0 justify-start rounded-2xl px-4"
          onClick={onAddStage}
        >
          <Plus />
          Aşama ekle
        </Button>
      </div>

      {/* Sürüklenirken imlecin altında yayla büyüyen kopya */}
      <DragOverlay
        dropAnimation={reduce ? null : { duration: 260, easing: "cubic-bezier(0.34, 1.45, 0.64, 1)" }}
      >
        {draggingCard ? (
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={reduce ? undefined : { scale: 1.04, rotate: 1.5 }}
            transition={{ type: "spring", visualDuration: 0.4, bounce: 0.25 }}
            className="surface-flat w-[17rem] cursor-grabbing bg-card p-3 shadow-[var(--shadow-pop)]"
          >
            <p className="truncate text-[0.9375rem] font-medium">{draggingCard.full_name}</p>
            {draggingCard.phone && (
              <p className="mt-0.5 text-subhead text-label-2 tabular-nums">{draggingCard.phone}</p>
            )}
          </motion.div>
        ) : draggingColumn ? (
          <div className="surface w-72 px-4 py-3 shadow-[var(--shadow-pop)]">
            <p className="truncate text-[0.9375rem] font-semibold">{draggingColumn.name}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Sütun: kartların bırakılacağı opak yüzey. */
function Column({
  stage,
  dimmed,
  children,
}: {
  stage: PipelineStage;
  dimmed: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${stage.id}`,
    data: { stageId: stage.id },
  });
  return (
    <section
      ref={setNodeRef}
      aria-label={stage.name}
      className={cn(
        "surface flex w-72 shrink-0 flex-col transition-[box-shadow,opacity] duration-150",
        isOver && "ring-2 ring-primary",
        dimmed && "opacity-60"
      )}
    >
      {children}
    </section>
  );
}

/** Aşamayı yeniden sıralamak için tutamak. */
function ColumnHandle({ stage }: { stage: PipelineStage }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `colhandle-${stage.id}`,
    data: { type: "column", id: stage.id },
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`${stage.name} aşamasını taşı`}
      className={cn(
        "focus-ring grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-label-3 hover:bg-hover active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <GripVertical aria-hidden className="size-4" />
    </button>
  );
}

/** Sade lead kartı. Tıklayınca ayrıntı açılır; sürüklenince aşama değişir. */
function LeadCard({
  lead,
  assignee,
  onOpen,
}: {
  lead: Customer;
  assignee: string | null;
  onOpen: () => void;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `card-${lead.id}`,
    data: { type: "card", id: lead.id },
  });
  return (
    <li>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${lead.full_name}. Ayrıntı için Enter, taşımak için Boşluk tuşu.`}
        onClick={onOpen}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          if (e.key === "Enter" && !isDragging) onOpen();
        }}
        className={cn(
          "surface-flat focus-ring block cursor-grab touch-none p-3 transition-colors duration-150 hover:bg-fill-2 active:cursor-grabbing",
          isDragging && "opacity-40"
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] leading-5 font-medium">{lead.full_name}</p>
            {lead.phone && (
              <p className="mt-0.5 flex items-center gap-1 text-subhead text-label-2 tabular-nums">
                <Phone aria-hidden className="size-3 shrink-0" />
                <span className="truncate">{lead.phone}</span>
              </p>
            )}
          </div>
          {assignee && (
            <span title={`İlgilenen: ${assignee}`}>
              <Avatar name={assignee} size="xs" />
            </span>
          )}
        </div>
        {lead.source && (
          <div className="mt-2">
            <Badge variant="outline" className="max-w-full">
              <span className="truncate">{lead.source}</span>
            </Badge>
          </div>
        )}
      </div>
    </li>
  );
}
