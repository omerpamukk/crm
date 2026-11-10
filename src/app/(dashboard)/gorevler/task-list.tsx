"use client";

import { ListTodo } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { StatusBadge } from "@/components/shared/status";

import {
  PRIORITY_LABEL,
  columnDot,
  formatDue,
  isOverdue,
  type BoardColumn,
  type BoardTask,
} from "./task-utils";

const ALL = "hepsi";

/**
 * Görev listesi: üstte liste seçici, altında o listedeki görevler.
 * Telefonda pano yerine bu görünüm kullanılır; masaüstünde "Liste" görünümüdür.
 */
export function TaskList({
  columns,
  tasks,
  today,
  columnFilter,
  onColumnFilter,
  onOpen,
  searching,
}: {
  columns: BoardColumn[];
  tasks: BoardTask[];
  today: string;
  columnFilter: string;
  onColumnFilter: (v: string) => void;
  onOpen: (task: BoardTask) => void;
  searching: boolean;
}) {
  const valid = columnFilter === ALL || columns.some((c) => c.id === columnFilter);
  const current = valid ? columnFilter : ALL;
  const shown = current === ALL ? tasks : tasks.filter((t) => t.columnId === current);
  const colOf = (t: BoardTask) => columns.find((c) => c.id === t.columnId);

  const items = [
    { value: ALL, label: "Tümü", count: tasks.length },
    ...columns.map((c) => ({
      value: c.id,
      label: c.label,
      count: tasks.filter((t) => t.columnId === c.id).length,
    })),
  ];

  return (
    <div className="min-w-0 space-y-4">
      <SegmentedControl
        items={items}
        value={current}
        onValueChange={onColumnFilter}
        aria-label="Liste"
        size="touch"
        className="w-full md:w-auto"
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={searching ? "Aramaya uyan görev yok" : "Bu listede görev yok"}
          description={
            searching
              ? "Aramayı değiştirin ya da temizleyin."
              : "Başka bir listeye bakın ya da yeni görev ekleyin."
          }
        />
      ) : (
        <ListGroup aria-label="Görevler" inset={44}>
          {shown.map((t) => {
            const col = colOf(t);
            const done = col?.isDone ?? false;
            const overdue = isOverdue(t, today, done);
            const due = done ? "" : formatDue(t.dueAt, today);
            return (
              <ListRow
                key={t.id}
                leading={
                  <span
                    aria-hidden
                    className={cn("mx-2.5 size-2.5 rounded-full", col ? columnDot(col) : "bg-label-3")}
                  />
                }
                title={<span className={cn(done && "text-label-2 line-through")}>{t.title}</span>}
                subtitle={
                  <span className="inline-flex max-w-full items-center gap-1.5">
                    {t.assigneeId && <Avatar name={t.assigneeName} size="xs" />}
                    <span className="truncate">
                      {[t.assigneeName, t.customerName].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                }
                meta={
                  overdue ? (
                    <StatusBadge variant="danger">Gecikti · {due}</StatusBadge>
                  ) : !done && t.priority === "high" ? (
                    <StatusBadge variant="danger">{PRIORITY_LABEL.high}</StatusBadge>
                  ) : due ? (
                    <span className="text-label-2 tabular-nums">{due}</span>
                  ) : undefined
                }
                trailing={
                  current === ALL && col ? (
                    <span className="max-w-[6.5rem] truncate text-subhead text-label-2">{col.label}</span>
                  ) : undefined
                }
                chevron
                onClick={() => onOpen(t)}
              />
            );
          })}
        </ListGroup>
      )}
    </div>
  );
}
