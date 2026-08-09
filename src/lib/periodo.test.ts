import { describe, expect, it } from "vitest";
import { formatarPeriodo } from "./periodo";

describe("formatarPeriodo (ETAPA 10)", () => {
  it("converte ISO (entrou_em do backend) em 'mai/2026'", () => {
    expect(formatarPeriodo("2026-05-01T00:00:00.000Z")).toBe("mai/2026");
    expect(formatarPeriodo("2026-01-15T10:00:00.000Z")).toBe("jan/2026");
    expect(formatarPeriodo("2025-12-31T23:59:59.000Z")).toBe("dez/2025");
  });

  it("mantém períodos já formatados ('jan/2026 — atual')", () => {
    expect(formatarPeriodo("Mai/2026 — atual")).toBe("Mai/2026 — atual");
    expect(formatarPeriodo("Set/2025 — Dez/2025")).toBe("Set/2025 — Dez/2025");
  });

  it("vazio/null/undefined → string vazia", () => {
    expect(formatarPeriodo("")).toBe("");
    expect(formatarPeriodo(null)).toBe("");
    expect(formatarPeriodo(undefined)).toBe("");
  });
});
