import Link from "next/link";
import { Compass } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-card text-muted-foreground">
          <Compass className="size-5" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sayfa bulunamadı
          </h1>
          <p className="text-sm text-muted-foreground">
            Aradığın sayfa taşınmış veya hiç var olmamış olabilir.
          </p>
        </div>
        <Link href="/panel" className={buttonVariants()}>
          Panele dön
        </Link>
      </div>
    </div>
  );
}
