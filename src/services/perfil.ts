import axios from "axios";
import { api, USER_KEY } from "./api";

export type UpdateUserProfilePayload = {
  nome: string;
  bio?: string;
  localizacao?: string;
};

export type Habilidade = {
  id: number;
  nome: string;
};

type ApiEnvelope = {
  sucesso: boolean;
  message?: string;
  dados?: unknown;
};

function getAuthUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(USER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { id?: string | number | null };
    return parsed.id != null && parsed.id !== "" ? String(parsed.id) : null;
  } catch {
    return null;
  }
}

function toFriendlyError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

/**
 * PATCH /usuarios/:id — atualiza nome/bio/localização do usuário autenticado.
 * O id vem do usuário logado (localStorage) e o middleware `somenteProprioOuAdm`
 * exige que ele bata com o id numérico do token.
 */
export async function updateUserProfile(payload: UpdateUserProfilePayload): Promise<ApiEnvelope> {
  const id = getAuthUserId();
  if (!id) throw new Error("Usuário não autenticado.");

  try {
    const { data } = await api.patch<ApiEnvelope>(`/usuarios/${id}`, payload);
    if (!data.sucesso) throw new Error(data.message || "Não foi possível atualizar o perfil.");
    return data;
  } catch (err) {
    throw toFriendlyError(err, "Erro ao salvar perfil. Tente novamente.");
  }
}

/** GET /habilidades — lista global de habilidades (autenticado). */
export async function fetchHabilidades(): Promise<Habilidade[]> {
  try {
    const { data } = await api.get<{ sucesso: boolean; dados?: Habilidade[] }>("/habilidades");
    if (data.sucesso && Array.isArray(data.dados)) return data.dados;
    return [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao carregar habilidades.");
  }
}

/** POST /habilidades-usuario — vincula uma habilidade global ao usuário. */
export async function addHabilidadeUsuario(usuarioId: string, habilidadeId: number): Promise<void> {
  const usuarioIdNum = Number(usuarioId);
  if (!Number.isFinite(usuarioIdNum)) throw new Error("Usuário não autenticado.");

  try {
    const { data } = await api.post<ApiEnvelope>("/habilidades-usuario", {
      usuario_id: usuarioIdNum,
      habilidade_id: habilidadeId,
      nivel: 1,
    });
    if (!data.sucesso) throw new Error(data.message || "Não foi possível salvar a habilidade.");
  } catch (err) {
    throw toFriendlyError(err, "Erro ao salvar habilidade.");
  }
}

const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Mapeia os nomes das skills (strings) para ids da base global e vincula cada
 * uma via POST /habilidades-usuario (em paralelo, Promise.all).
 * Skills sem correspondência na base global são puladas com console.warn —
 * somente adm pode criar habilidade global.
 */
export async function syncUserSkills(
  skillNames: string[],
): Promise<{ added: number; skipped: string[] }> {
  const usuarioId = getAuthUserId();
  if (!usuarioId) throw new Error("Usuário não autenticado.");

  const habilidades = await fetchHabilidades();
  const byNormalizedName = new Map<string, Habilidade>();
  habilidades.forEach((h) => byNormalizedName.set(normalizeText(h.nome), h));

  const seenIds = new Set<number>();
  const results = await Promise.all(
    skillNames.map(async (skillName) => {
      const matched = byNormalizedName.get(normalizeText(skillName));
      if (!matched) {
        console.warn(
          `[perfil] Habilidade "${skillName}" não encontrada na base global; ignorada (somente adm pode criá-la).`,
        );
        return false;
      }
      if (seenIds.has(matched.id)) return true;
      seenIds.add(matched.id);
      await addHabilidadeUsuario(usuarioId, matched.id);
      return true;
    }),
  );

  const skipped = skillNames.filter((_, i) => !results[i]);
  return { added: results.filter(Boolean).length, skipped };
}
