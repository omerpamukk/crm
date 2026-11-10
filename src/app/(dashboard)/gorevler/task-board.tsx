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
import { CheckCircle2, MoreHorizontal, Pencil, Plus, Trash2, User, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMotionPreset } from "@/lib/motion";
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
import { formatTime } from "@/lib/format";

import {
  PRIORITY_LABEL,
  columnDot,
  formatDue,
  isOverdue,
  type BoardColumn,
  type BoardTask,
} from "./task-utils";

/**
 * Görev panosu (masaüstü ve tablet): listeler sütun, görevler kart.
 * Kartı başka listeye sürükleyin. Klavyede: karta odaklanıp Boşluk ile alın,
 * ok tuşlarıyla taşıyın, Boşluk ile bırakın; Enter ayrıntıyı açar.
 * Pano genişse yalnızca kendi alanı içinde yatay kayar; sayfa taşmaz.
 */
export function TaskBoard({
  columns,
  tasks,
  today,
  canManageLists,
  onOpen,
  onMove,
  onRename,
  onAskDelete,
  onAddList,
}: {
  columns: BoardColumn[];
  tasks: BoardTask[];
  today: string;
  canManageLists: boolean;
  onOpen: (task: BoardTask) => void;
  onMove: (taskId: string, toColumnId: string) => void;
  onRename: (columnId: string, name: string) => void;
  onAskDelete: (column: BoardColumn) => void;
  onAddList: () => void;
}) {
  const { reduce } = useMotionPreset();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  );

  function onDragStart(e: DragStartEvent) {
    const id = (e.active.data.current as { id?: string } | undefined)?.id;
    if (id) setActiveId(id);
  }

  function onDragEnd(e: DragEndEvent) {
    const id = activeId;
    setActiveId(null);
    if (!id || !e.over) return;
    const toCol = (e.over.data.current as { colId?: string } | undefined)?.colId;
    if (toCol) onMove(id, toCol);
  }

  function commitRename(col: BoardColumn) {
    const name = editName.trim();
    setEditingId(null);
    if (name && name !== col.label) onRename(col.id, name);
  }

  const dragging = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      id="task-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {/* Yalnızca bu alan yatay kayar; sayfa genişliği değişmez. */}
      <div
        role="region"
        aria-label="Görev panosu"
        tabIndex={0}
        className="focus-ring -mx-4 flex min-w-0 items-start gap-4 overflow-x-auto overscroll-x-contain px-4 pb-4 md:-mx-0 md:px-0"
      >
        {columns.map((col) => {
          const items = tasks.filter((t) => t.columnId === col.id);
          return (
            <Column key={col.id} col={col}>
              <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", columnDot(col))} />
                {editingId === col.id ? (
                  <Input
                    autoFocus
                    aria-label="Liste adı"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitRename(col)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(col);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-8 min-w-0 flex-1"
                  />
                ) : (
                  <h3 className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold" title={col.label}>
                    {col.label}
                  </h3>
                )}
                <Badge variant="secondary" aria-label={`${items.length} görev`}>
                  {items.length}
                </Badge>
                {canManageLists && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`${col.label} liste işlemleri`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingId(col.id);
                          setEditName(col.label);
                        }}
                      >
                        <Pencil />
                        Adı değiştir
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={columns.length <= 1}
                        onClick={() => onAskDelete(col)}
                      >
                        <Trash2 />
                        Listeyi sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <ul role="list" className="space-y-2 p-2 pt-1">
                {items.length === 0 ? (
                  <li className="px-2 py-8 text-center text-subhead text-label-2">
                    Görevi buraya sürükleyin
                  </li>
                ) : (
                  items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      done={col.isDone}
                      today={today}
                      onOpen={() => onOpen(t)}
                    />
                  ))
                )}
              </ul>
            </Column>
          );
        })}

        {canManageLists && (
          <Button
            variant="secondary"
            className="h-11 w-72 shrink-0 justify-start rounded-2xl px-4"
            onClick={onAddList}
          >
            <Plus />
            Liste ekle
          </Button>
        )}
      </div>

      {/* Sürüklenirken imlecin altında yayla büyüyen kopya */}
      <DragOverlay
        dropAnimation={reduce ? null : { duration: 260, easing: "cubic-bezier(0.34, 1.45, 0.64, 1)" }}
      >
        {dragging ? (
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={reduce ? undefined : { scale: 1.04, rotate: 1.5 }}
            transition={{ type: "spring", visualDuration: 0.4, bounce: 0.25 }}
            className="surface-flat w-[17rem] cursor-grabbing bg-card p-3 shadow-[var(--shadow-pop)]"
          >
            <p className="truncate text-[0.9375rem] font-medium">{dragging.title}</p>
            <p className="mt-0.5 truncate text-subhead text-label-2">{dragging.assigneeName}</p>
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Liste: kartların bırakılacağı opak yüzey. */
function Column({ col, children }: { col: BoardColumn; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.id}`, data: { colId: col.id } });
  return (
    <section
      ref={setNodeRef}
      aria-label={col.label}
      className={cn(
        "surface flex w-72 shrink-0 flex-col transition-[box-shadow] duration-150",
        isOver && "ring-2 ring-primary"
      )}
    >
      {children}
    </section>
  );
}

/** Sade görev kartı. Tıklayınca ayrıntı açılır; sürüklenince liste değişir. */
function TaskCard({
  task,
  done,
  today,
  onOpen,
}: {
  task: BoardTask;
  done: boolean;
  today: string;
  onOpen: () => void;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { id: task.id },
  });
  const overdue = isOverdue(task, today, done);

  return (
    <li>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${task.title}. Ayrıntı için Enter, taşımak için Boşluk tuşu.`}
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
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 text-[0.9375rem] leading-5 font-medium break-words",
              done && "text-label-2 line-through"
            )}
          >
            {task.title}
          </p>
          {done && <CheckCircle2 aria-label="Tamamlandı" className="mt-0.5 size-4 shrink-0 text-positive-text" />}
        </div>

        {task.description && !done && (
          <p className="mt-1 line-clamp-2 text-subhead text-label-2">{task.description}</p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-subhead text-label-2">
            {task.assigneeId ? <Avatar name={task.assigneeName} size="xs" /> : <User aria-hidden className="size-4 shrink-0" />}
            <span className="truncate">{task.assigneeName}</span>
          </span>
          {done ? (
            task.completedAt && (
              <span className="text-subhead whitespace-nowrap text-label-2">
                Bitti · {formatTime(task.completedAt)}
              </span>
            )
          ) : task.dueAt ? (
            <span
              className={cn(
                "text-subhead whitespace-nowrap tabular-nums",
                overdue ? "font-semibold text-danger-text" : "text-label-2"
              )}
            >
              {overdue ? "Gecikti · " : ""}
              {formatDue(task.dueAt, today)}
            </span>
          ) : null}
        </div>

        {(!done && task.priority === "high") || task.isAuto || task.customerName ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {!done && task.priority === "high" && <Badge variant="danger">{PRIORITY_LABEL.high}</Badge>}
            {task.isAuto && (
              <Badge variant="secondary">
                <Zap aria-hidden />
                Otomatik
              </Badge>
            )}
            {task.customerName && (
              <Badge variant="outline" className="max-w-full">
                <span className="truncate">{task.customerName}</span>
              </Badge>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}
