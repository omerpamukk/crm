import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Geliştirme simgesi telefonda sekme çubuğunu örtüyordu; derleme ve çalışma
  // hataları yine ekranda gösterilir.
  devIndicators: false,
};

export default nextConfig;
