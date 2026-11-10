export type SaleRow = {
  id: string;
  date: string;
  customerId: string | null;
  customer: string;
  item: string;
  amount: number;
  kind: "Paket" | "Hizmet";
  /** Paket için ödeme durumu; hizmet satışında null. */
  status: string | null;
  packageId: string | null;
  remaining: number;
};

export type PaymentRow = {
  id: string;
  created_at: string;
  customerId: string | null;
  customer: string;
  amount: number;
  method: string;
  related_type: string | null;
  note: string | null;
};
