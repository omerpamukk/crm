"use client";

import { useEffect } from "react";

/**
 * Kök hata sınırı — root layout render edilemediğinde devreye girer.
 * Kendi <html> ve <body> etiketlerini tanımlamak zorundadır, çünkü
 * aktifken root layout'un yerini alır.
 *
 * Bu yüzden global stiller/fontlar yüklenmemiş olabilir: satır içi stil.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Kritik hata:", error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#f7f8fa",
          color: "#18181b",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            textAlign: "center",
            background: "#fff",
            border: "1px solid #e6e7eb",
            borderRadius: "12px",
            padding: "2rem",
          }}
        >
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Bir şeyler ters gitti
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#52525b", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
            Uygulama beklenmedik bir hatayla karşılaştı. Tekrar denemek sorunu
            çözmezse birkaç dakika sonra yeniden deneyin.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: "2.25rem",
              padding: "0 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#fff",
              background: "#6d3ef2",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
          {error.digest && (
            <p style={{ fontSize: "0.6875rem", color: "#8a8f98", margin: "1rem 0 0" }}>
              Hata kodu: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
