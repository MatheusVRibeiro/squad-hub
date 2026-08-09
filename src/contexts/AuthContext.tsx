import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY, USER_KEY } from "@/services/api";
import { syncUserSkills, fetchMe } from "@/services/perfil";

export type User = {
  id?: string;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  skills?: string[];
  avatarUrl?: string;
  role?: "admin" | "user";
};

export type SignInData = { email: string; password: string };
export type SignUpData = {
  name: string;
  email: string;
  password: string;
  bio?: string;
  location?: string;
  skills: string[];
};

type LoginResponse = {
  sucesso: boolean;
  message: string;
  token: string;
  dados: {
    id: number;
    nome: string;
    email: string;
    tipo: string;
    bio?: string;
    localizacao?: string;
    avatar_url?: string;
  };
};

/** POST /login e mapeia a resposta para o formato User usado pelo contexto. */
async function loginAndMap(
  email: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const { data } = await api.post<LoginResponse>("/login", {
    email,
    senha: password,
  });

  const user: User = {
    id: String(data.dados.id),
    name: data.dados.nome,
    email: data.dados.email,
    bio: data.dados.bio,
    location: data.dados.localizacao,
    avatarUrl: data.dados.avatar_url ?? undefined,
    role: data.dados.tipo === "adm" ? "admin" : "user",
  };

  return { token: data.token, user };
}

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (data: SignInData) => Promise<void>;
  signUp: (data: SignUpData) => Promise<boolean>;
  signOut: () => void;
  updateUser: (nextUser: User) => void;
  /** Persiste token + usuário na sessão (fluxo GitHub pós-callback). */
  persistSession: (token: string, nextUser: User) => void;
  /** Login via GitHub (ETAPA 1): salva o token do callback e busca /usuarios/me. */
  signInWithGithubToken: (token: string) => Promise<User>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const token = window.localStorage.getItem(TOKEN_KEY);
      const stored = window.localStorage.getItem(USER_KEY);
      if (token && stored) setUser(JSON.parse(stored) as User);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persist = useCallback((token: string, nextUser: User) => {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const updateUser = useCallback((nextUser: User) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    }
    setUser(nextUser);
  }, []);

  /** Persiste token + usuário (mesma base do signIn/signUp local). */
  const persistSession = useCallback(
    (token: string, nextUser: User) => {
      persist(token, nextUser);
    },
    [persist],
  );

  /**
   * Fluxo GitHub (ETAPA 1) — usuário já existente: o callback entrega apenas o
   * token. Persiste o token (para o interceptor autenticar), busca os dados em
   * /usuarios/me e salva a sessão completa.
   */
  const signInWithGithubToken = useCallback(
    async (token: string): Promise<User> => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_KEY, token);
      }
      const dados = await fetchMe();
      const user: User = {
        id: String(dados.id),
        name: dados.nome,
        email: dados.email,
        bio: dados.bio ?? undefined,
        location: dados.localizacao ?? undefined,
        avatarUrl: dados.avatar_url ?? undefined,
        role: dados.tipo === "adm" ? "admin" : "user",
      };
      persist(token, user);
      return user;
    },
    [persist],
  );

  const signIn = useCallback(
    async ({ email, password }: SignInData) => {
      const { token, user } = await loginAndMap(email, password);
      persist(token, user);
    },
    [persist],
  );

  const signUp = useCallback(
    async (payload: SignUpData): Promise<boolean> => {
      await api.post<{
        sucesso: boolean;
        message: string;
        dados: {
          id: number;
          nome: string;
          email: string;
          bio?: string;
          localizacao?: string;
        };
      }>("/usuarios", {
        nome: payload.name,
        email: payload.email,
        senha: payload.password,
        bio: payload.bio,
        localizacao: payload.location,
      });

      // Login automático pós-cadastro: garante que o token e o id do usuário
      // recém-criado fiquem disponíveis para o sync de skills (GET /habilidades
      // e POST /habilidades-usuario são endpoints autenticados). Se o login
      // falhar, o cadastro continua válido e o usuário entra manualmente — nesse
      // caso o sync é pulado (não há token para autenticar as chamadas).
      let token: string;
      let user: User;
      try {
        const auth = await loginAndMap(payload.email, payload.password);
        token = auth.token;
        user = auth.user;
      } catch (err) {
        console.warn(
          "[auth] Conta criada, mas o login automático falhou; o usuário deve entrar manualmente.",
          err,
        );
        return false;
      }

      persist(token, { ...user, skills: payload.skills });

      // Best-effort: falha no sync NÃO derruba o cadastro.
      if (payload.skills.length > 0) {
        try {
          const result = await syncUserSkills(payload.skills);
          console.info(
            `[auth] Skills sincronizadas pós-cadastro: ${result.added} adicionadas, ${result.skipped.length} ignoradas.`,
          );
        } catch (err) {
          console.warn(
            "[auth] Falha ao sincronizar skills após o cadastro (cadastro mantido).",
            err,
          );
        }
      }

      return true;
    },
    [persist],
  );

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      signIn,
      signUp,
      signOut,
      updateUser,
      persistSession,
      signInWithGithubToken,
    }),
    [user, isLoading, signIn, signUp, signOut, updateUser, persistSession, signInWithGithubToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
