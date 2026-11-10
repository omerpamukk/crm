"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListTodo, Plus } from "lucide-react";
import { toast } from "sonner";

import { useUrlState } from "@/lib/use-url-state";
import { formatDateTime } from "@/lib/format";
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
import { toastUndo } from "@/components/ui/sonner";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { PageHeader } from "@/components/shared/page-header";

import {
  createColumn,
  deleteColumn,
  deleteTask,
  moveTask as moveTaskAction,
  renameColumn,
} from "./actions";
import { TaskBoard } from "./task-board";
import { TaskForm } from "./task-form";
import { TaskList } from "./task-list";
import {
  LIST_COLORS,
  type BoardColumn,
  type BoardOption,
  type BoardTask,
} from "./task-utils";

const VIEWS = [
  { value: "pano", label: "Pano" },
  { value: "liste", label: "Liste" },
] as const;

export function TasksView({
  columns,
  tasks,
  staff,
  customers,
  canManageLists,
  today,
  loadFailed,
}: {
  columns: BoardColumn[];
  tasks: BoardTask[];
  staff: BoardOption[];
  customers: BoardOption[];
  canManageLists: boolean;
  today: string;
  loadFailed: boolean;
}) {
  const router = useRouter();

  // Sunucudan gelen veri yenilenince yerel kopyayı eşitle
  const [colList, setColList] = useState(columns);
  const [taskList, setTaskList] = useState(tasks);
  const [prevCols, setPrevCols] = useState(columns);
  const [prevTasks, setPrevTasks] = useState(tasks);
  if (prevCols !== columns) {
    setPrevCols(columns);
    setColList(columns);
  }
  if (prevTasks !== tasks) {
    setPrevTasks(tasks);
    setTaskList(tasks);
  }

  // Görünüm ve filtreler URL'de
  const [viewRaw, setView] = useUrlState("gorunum", "pano");
  const view = viewRaw === "liste" ? "liste" : "pano";
  const [listFilter, setListFilter] = useUrlState("liste", "hepsi");
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

  const visible = useMemo(() => {
    const n = q.trim().toLocaleLowerCase("tr");
    if (!n) return taskList;
    return taskList.filter((t) =>
      [t.title, t.description, t.assigneeName, t.customerName ?? ""]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(n)
    );
  }, [taskList, q]);

  // Form paneli: "new" = yeni görev, aksi halde düzenlenen görevin kimliği
  const [panel, setPanel] = useState<{ id: string | "new"; open: boolean } | null>(null);
  const editing = panel && panel.id !== "new" ? (taskList.find((t) => t.id === panel.id) ?? null) : null;
  const [deleteTarget, setDeleteTarget] = useState<BoardTask | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteList, setDeleteList] = useState<BoardColumn | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const defaultColumnId = (colList.find((c) => !c.isDone) ?? colList[0])?.id ?? "";

  // ---- Liste değiştirme (geri alınabilir) ----
  async function moveTask(taskId: string, toColumnId: string, silent = false) {
    const task = taskList.find((t) => t.id === taskId);
    if (!task || task.columnId === toColumnId) return;
    const fromId = task.columnId;
    const to = colList.find((c) => c.id === toColumnId);

    // Taşınan kart hedef listenin sonuna eklenir.
    const next = [...taskList.filter((t) => t.id !== taskId), { ...task, columnId: toColumnId }];
    setTaskList(next);
    const ordered = next.filter((t) => t.columnId === toColumnId).map((t) => t.id);
    const res = await moveTaskAction(taskId, toColumnId, ordered);
    if (res.error) {
      toast.error(res.error);
      setTaskList(taskList);
      return;
    }
    router.refresh();
    if (!silent) {
      toastUndo(`${task.title} · ${to?.label ?? ""}`, () => {
        void moveTask(taskId, fromId, true);
      });
    }
  }

  // ---- Görev silme: onaylı ----
  async function confirmDeleteTask() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteTask(deleteTarget.id);
    setDeleting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Görev silindi");
    setDeleteTarget(null);
    setPanel(null);
    router.refresh();
  }

  // ---- Liste yönetimi ----
  async function rename(columnId: string, name: string) {
    setColList((prev) => prev.map((c) => (c.id === columnId ? { ...c, label: name } : c)));
    const res = await renameColumn(columnId, name);
    if (res.error) {
      toast.error(res.error);
      setColList(columns);
      return;
    }
    toast.success("Liste adı değişti");
    router.refresh();
  }

  async function confirmAddList() {
    const name = newListName.trim();
    if (!name) {
      toast.error("Listeye bir ad yazın.");
      return;
    }
    const res = await createColumn({ label: name, color: LIST_COLORS[colList.length % LIST_COLORS.length] });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Liste eklendi");
    setAddOpen(false);
    setNewListName("");
    router.refresh();
  }

  async function confirmDeleteList() {
    if (!deleteList) return;
    const res = await deleteColumn(deleteList.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Liste silindi");
    setDeleteList(null);
    router.refresh();
  }

  const hasTasks = taskList.length > 0;
  const deleteListCount = deleteList ? taskList.filter((t) => t.columnId === deleteList.id).length : 0;

  const header = (
    <PageHeader
      title="Görevler"
      description="Ekibin yapılacak işlerini listelerde takip edin; sürükleyerek bir sonraki listeye taşıyın."
      context={
        hasTasks ? (
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
        hasTasks ? (
          <SearchField variant="glass" value={q} onValueChange={setQ} placeholder="Görev ara" className="w-56" />
        ) : undefined
      }
      primary={
        colList.length > 0 ? (
          <ToolbarAction
            prominent
            icon={Plus}
            label="Yeni görev"
            onClick={() => setPanel({ id: "new", open: true })}
          />
        ) : undefined
      }
    />
  );

  let body: React.ReactNode;
  if (loadFailed) {
    body = <ErrorState title="Görevler yüklenemedi" onRetry={() => router.refresh()} />;
  } else if (colList.length === 0) {
    body = (
      <EmptyState
        icon={ListTodo}
        title="Henüz liste yok"
        description={
          canManageLists
            ? "Görevleri takip etmek için önce bir liste ekleyin (ör. Yapılacak, Sürüyor, Bitti)."
            : "Görevler listelerde tutulur. Yöneticinizden ilk listeyi eklemesini isteyin."
        }
        action={
          canManageLists ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              Liste ekle
            </Button>
          ) : undefined
        }
      />
    );
  } else if (!hasTasks) {
    body = (
      <EmptyState
        icon={ListTodo}
        title="Henüz görev yok"
        description="Yapılacak bir işi ekleyin; kime ait olduğunu ve ne zaman biteceğini belirleyin."
        action={
          <Button onClick={() => setPanel({ id: "new", open: true })}>
            <Plus />
            Yeni görev
          </Button>
        }
      />
    );
  } else {
    body = (
      <>
        <div className="md:hidden">
          <SearchField value={q} onValueChange={setQ} placeholder="Görev ara" size="lg" className="mb-4" />
        </div>
        <div className={view === "pano" ? "hidden md:block" : "hidden"}>
          <TaskBoard
            columns={colList}
            tasks={visible}
            today={today}
            canManageLists={canManageLists}
            onOpen={(t) => setPanel({ id: t.id, open: true })}
            onMove={(id, to) => void moveTask(id, to)}
            onRename={(id, name) => void rename(id, name)}
            onAskDelete={setDeleteList}
            onAddList={() => setAddOpen(true)}
          />
        </div>
        <div className={view === "pano" ? "md:hidden" : ""}>
          <TaskList
            columns={colList}
            tasks={visible}
            today={today}
            columnFilter={listFilter}
            onColumnFilter={setListFilter}
            onOpen={(t) => setPanel({ id: t.id, open: true })}
            searching={q.trim().length > 0}
          />
        </div>
      </>
    );
  }

  const panelOpen = Boolean(panel?.open) && (panel?.id === "new" || Boolean(editing));
  const closePanel = () => setPanel((p) => (p ? { ...p, open: false } : p));

  return (
    <div className="min-w-0 space-y-8">
      {header}
      {body}

      {/* Yeni görev / görevi düzenle */}
      <FormSheet
        open={panelOpen}
        onOpenChange={(o) => setPanel((p) => (p ? { ...p, open: o } : p))}
        title={editing ? "Görevi düzenle" : "Yeni görev"}
        description={
          editing ? `${editing.createdByLabel} oluşturdu · ${formatDateTime(editing.createdAt)}` : undefined
        }
      >
        {panel && (
          <TaskForm
            key={panel.id}
            task={editing ?? undefined}
            defaultColumnId={defaultColumnId}
            columns={colList}
            staff={staff}
            customers={customers}
            onSuccess={() => {
              closePanel();
              router.refresh();
            }}
            onCancel={closePanel}
            onDelete={editing ? () => setDeleteTarget(editing) : undefined}
          />
        )}
      </FormSheet>

      {/* Görevi sil: onay */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Görevi sil</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” silinecek. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive-solid" onClick={confirmDeleteTask} disabled={deleting}>
              {deleting ? "Siliniyor..." : "Görevi sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Liste ekle */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Liste ekle</DialogTitle>
            <DialogDescription>Yeni liste panonun sonuna eklenir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="list-name">Liste adı</Label>
            <Input
              id="list-name"
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Beklemede"
              onKeyDown={(e) => e.key === "Enter" && void confirmAddList()}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={confirmAddList}>Liste ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Listeyi sil: onay */}
      <Dialog open={!!deleteList} onOpenChange={(o) => !o && setDeleteList(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Listeyi sil</DialogTitle>
            <DialogDescription>
              {deleteListCount > 0
                ? `“${deleteList?.label}” ve içindeki ${deleteListCount} görev silinecek. Bu işlem geri alınamaz.`
                : `“${deleteList?.label}” silinecek. Bu işlem geri alınamaz.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteList(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive-solid" onClick={confirmDeleteList}>
              Listeyi sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
