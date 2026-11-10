import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Oturum açmadan görülen sayfaların çerçevesi: uygulama kabuğu yok, zemin
 * kabuktakiyle aynı, ortada tek kart. Giriş, şifre sayfaları, "Askıda" ve
 * "Hesap yok" bunu kullanır.
 */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-8">
      <div aria-hidden className="app-wall" />
      <main className="w-full max-w-sm">
        <p className="eyebrow mb-3 text-center">CRM</p>
        {children}
      </main>
    </div>
  );
}

/**
 * Kart: isteğe bağlı simge, başlık, açıklama, gövde ve alt bölüm.
 * İçerik katmanı opak (`surface`).
 */
export function AuthCard({
  icon: Icon,
  title,
  description,
  footer,
  className,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("surface p-6 sm:p-8", className)}>
      <div className={cn("space-y-1.5", Icon && "flex flex-col items-center text-center")}>
        {Icon && <Icon aria-hidden className="mb-1 size-10 text-label-3" strokeWidth={1.5} />}
        <h1 className="text-title-2 font-semibold text-balance">{title}</h1>
        {description && <p className="text-[0.9375rem] text-label-2">{description}</p>}
      </div>
      {children && <div className="mt-6">{children}</div>}
      {footer && <div className="mt-4 space-y-3 text-center">{footer}</div>}
    </section>
  );
}
