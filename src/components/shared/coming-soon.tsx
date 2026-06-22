import { Construction } from "lucide-react";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-20 text-center">
        <Construction className="size-10 text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          Bu modül yakında eklenecek.
        </p>
      </div>
    </div>
  );
}
