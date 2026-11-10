import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VitrinView } from "./vitrin-view";

export const metadata: Metadata = { title: "Bileşen vitrini" };

/**
 * Tasarım sistemi vitrini — yalnızca geliştirmede açılır. Bütün ortak
 * bileşenler, durumları ve boş/yükleniyor/hata halleri; açık ve koyu tema
 * yan yana. Kalite ve frontend için referans. Örnek veridir, veritabanına
 * dokunmaz.
 */
export default function VitrinPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <VitrinView />;
}
