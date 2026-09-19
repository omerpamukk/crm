import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // "@/..." yolları tsconfig'ten okunur (ayrı eklenti gerekmez)
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
