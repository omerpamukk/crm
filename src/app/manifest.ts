import type { MetadataRoute } from "next";

/**
 * PWA manifesti: telefonda "Ana ekrana ekle" ile uygulama gibi, tam ekran
 * ve kendi simgesiyle açılır. Renkler tasarım tokenlarının açık tema
 * değerleridir (manifest CSS değişkeni okuyamaz).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/panel",
    name: "Ravel — Müşteri ve Randevu",
    short_name: "Ravel",
    description: "İşletmen için müşteri, randevu, satış ve pazarlama yönetimi.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f2f7",
    theme_color: "#f2f2f7",
    lang: "tr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
