import { defineConfig } from "vitest/config";

// Configuração dedicada do Vitest (separada do vite.config.ts, que carrega os
// plugins pesados do TanStack Start / Cloudflare e não deve rodar nos testes).
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
