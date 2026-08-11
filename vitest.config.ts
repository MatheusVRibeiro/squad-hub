import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Configuração dedicada do Vitest (separada do vite.config.ts, que carrega os
// plugins pesados do TanStack Start / Cloudflare e não deve rodar nos testes).
export default defineConfig({
  resolve: {
    alias: {
      // Componentes/UI usam o alias "@/*" — sem ele, os testes de componente
      // (src/**/*.test.tsx) não resolvem os imports de src/components.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    clearMocks: true,
    restoreMocks: true,
  },
});
