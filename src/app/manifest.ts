import type { MetadataRoute } from "next";

/**
 * PWA manifesti — salon resepsiyonundaki tablete "ana ekrana ekle"
 * yapılabilsin diye.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CRM — Müşteri ve Randevu Yönetimi",
    short_name: "CRM",
    description:
      "İşletmen için müşteri, randevu, paket ve tahsilat yönetimi.",
    start_url: "/panel",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#6d3ef2",
    lang: "tr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
