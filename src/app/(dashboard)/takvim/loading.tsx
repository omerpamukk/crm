import { Skeleton } from "@/components/shared/skeletons";

/** Takvim iskeleti: başlık + görünüm/tarih + zaman ızgarası (telefonda liste). */
export default function Loading() {
  return (
    <div className="space-y-5 md:space-y-6" role="status" aria-label="Takvim yükleniyor">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between" aria-hidden>
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <Skeleton className="h-11 w-full rounded-full md:h-7 md:w-44" />
          <Skeleton className="h-11 w-full rounded-full md:h-8 md:w-80" />
        </div>
      </div>

      {/* Masaüstü: saat sütunu + 4 sütun */}
      <div className="surface hidden overflow-clip md:block" aria-hidden>
        <div className="grid grid-cols-[56px_repeat(4,minmax(0,1fr))] border-b border-separator">
          <div />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 border-l border-separator px-3 py-2.5">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid h-[28rem] grid-cols-[56px_repeat(4,minmax(0,1fr))]">
          <div className="space-y-[52px] px-2 pt-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="ml-auto h-3 w-9" />
            ))}
          </div>
          {[
            ["top-4", "top-36", "top-72"],
            ["top-20", "top-56"],
            ["top-8", "top-40", "top-80"],
            ["top-28", "top-64"],
          ].map((tops, i) => (
            <div key={i} className="relative border-l border-separator">
              {tops.map((t) => (
                <Skeleton key={t} className={`absolute inset-x-1 h-14 rounded-[9px] ${t}`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Telefon: liste */}
      <div className="space-y-2 md:hidden" aria-hidden>
        <Skeleton className="mx-1 h-5 w-40" />
        <div className="surface overflow-clip">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex min-h-[64px] items-center gap-3 px-4">
              <Skeleton className="h-8 w-10" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
