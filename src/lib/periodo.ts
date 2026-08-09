/**
 * ETAPA 10 — Formatação do período de participação exibido no histórico.
 *
 * O backend retorna `entrou_em` (ISO: "2026-05-01T00:00:00.000Z") ou períodos
 * já formatados ("jan/2026 — atual"). Esta função normaliza ambos para o
 * padrão exibido no perfil ("mai/2026").
 */
const MESES_ABREV = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function formatarPeriodo(periodo: string | null | undefined): string {
  const valor = (periodo ?? "").trim();
  if (!valor) return "";

  // Período já formatado (ex.: "jan/2026 — atual") passa direto.
  if (valor.includes("/") || valor.includes("—") || valor.includes("–")) return valor;

  // ISO / data crua → "mai/2026". Getters UTC evitam que o fuso local (ex.:
  // UTC-3) desloque datas próximas à virada do mês para o mês anterior.
  const data = new Date(valor);
  if (!Number.isNaN(data.getTime())) {
    return `${MESES_ABREV[data.getUTCMonth()]}/${data.getUTCFullYear()}`;
  }

  return valor;
}
