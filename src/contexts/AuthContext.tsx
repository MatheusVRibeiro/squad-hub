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
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => void;
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

  const signIn = useCallback(
    async ({ email, password }: SignInData) => {
      const { data } = await api.post<{ token: string; user: User }>("/sessions", {
        email,
        password,
      });
      persist(data.token, data.user);
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
      signUp,
      signOut,
    }),
    [user, isLoading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}