export type Movement = {
  id: string;
  date: string;
  kind: "paket" | "hizmet" | "odeme";
  /** Paket/hizmet adı; ödemede yöntem adı. */
  title: string;
  amount: number;
  /** Ödemede bağlı olduğu şey ("Paket", "Randevu"). */
  detail: string | null;
};

export type CariRow = {
  id: string;
  name: string;
  phone: string | null;
  charges: number;
  payments: number;
  balance: number;
  lastPaymentAt: string | null;
  overdue: boolean;
  /** En yeni önce; en çok 30 kayıt. */
  movements: Movement[];
};

export function waLink(phone: string | null, msg: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let p = digits;
  if (p.startsWith("0")) p = "90" + p.slice(1);
  else if (!p.startsWith("90")) p = "90" + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
