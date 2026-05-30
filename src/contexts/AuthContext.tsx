import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY, USER_KEY } from "@/services/api";

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

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (data: SignInData) => Promise<void>;
  signInTemp: (data?: SignInData & { role?: "admin" | "user" }) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => void;
  updateUser: (nextUser: User) => void;
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

  const signIn = useCallback(
    async ({ email, password }: SignInData) => {
      // In development you can bypass the API by using the TEMP_LOGIN query param
      // e.g. /login?tempLogin=1 — this will create a temporary user locally.
      if (typeof window !== 'undefined' && window.location.search.includes('tempLogin')) {
        const tempUser: User = {
          id: 'temp',
          name: email.split('@')[0] ?? 'Usuário temporário',
          email,
        };
        persist('temp-token', tempUser);
        return;
      }

      const { data } = await api.post<{ token: string; user: User }>('/sessions', {
        email,
        password,
      });
      persist(data.token, data.user);
    },
    [persist],
  );

  const signInTemp = useCallback(
    async (payload?: SignInData & { role?: "admin" | "user" }) => {
      const email = payload?.email ?? 'temp@example.com';
      const tempUser: User = {
        id: 'temp',
        name: email.split('@')[0] ?? 'Usuário temporário',
        email,
        role: payload?.role ?? 'user',
      };
      persist('temp-token', tempUser);
    },
    [persist],
  );

  const signUp = useCallback(
    async (payload: SignUpData) => {
      const { data } = await api.post<{ token: string; user: User }>("/users", payload);
      if (data?.token && data?.user) {
        persist(data.token, data.user);
      }
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
      signInTemp,
      signUp,
      signOut,
      updateUser,
    }),
    [user, isLoading, signIn, signInTemp, signUp, signOut, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}