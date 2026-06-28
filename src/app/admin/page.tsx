import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Firmalar</h1>
        <p className="text-sm text-muted-foreground">Tüm işletmeleri görüntüle, yönet ve yeni firma oluştur.</p>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">Firma listesi ve özet bir sonraki adımda eklenecek.</p>
      </div>
    </div>
  );
}
