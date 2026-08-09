import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Lê o token do fragment (#token=...) — prioritário, pois não vaza via
 * Referer/histórico/logs — com fallback para a query string (?token=...) por
 * compatibilidade. Ao ler do fragment, limpa a URL (history.replaceState) para
 * o token não ficar registrado no histórico do navegador.
 */
function readTokenFromHash(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hash = window.location.hash;
  if (!hash) return undefined;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("token");
  if (token) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    return token;
  }
  return undefined;
}

function GithubSuccessPage() {
  // /auth/github/success#token=... (ou ?token=... por compatibilidade) — o
  // callback do backend redireciona para cá quando a conta GitHub já está
  // vinculada (login direto).
  const search = useSearch({ strict: false }) as { token?: string };
  const queryToken = typeof search?.token === "string" ? search.token : undefined;
  const [token, setToken] = useState<string | undefined>(queryToken);
  const [resolved, setResolved] = useState(false);

  const { signInWithGithubToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hashToken = readTokenFromHash();
    if (hashToken) setToken(hashToken);
    setResolved(true);
  }, []);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    signInWithGithubToken(token)
      .then(() => navigate({ to: "/dashboard", replace: true }))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Não foi possível entrar com o GitHub.");
      });
  }, [token, signInWithGithubToken, navigate]);

  const failed = resolved && (!token || error);

  return (
    <AuthLayout
      title={error ? "Não foi possível entrar" : failed ? "Link inválido" : "Entrando..."}
      subtitle={
        error
          ? "Ocorreu um erro ao concluir o login com GitHub."
          : failed
            ? "Não foi possível concluir o login com GitHub."
            : "Concluindo seu login com GitHub."
      }
      footer={
        <>
          Voltar para o{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            login
          </Link>
        </>
      }
    >
      {failed ? (
        <div className="space-y-5 text-center">
          <p className="text-sm text-muted-foreground">
            {error ??
              "O token de autenticação está ausente ou expirou. Tente entrar novamente com o GitHub."}
          </p>
          <Button asChild className="h-11 w-full rounded-xl font-semibold shadow-md">
            <Link to="/login">Ir para o login</Link>
          </Button>
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </AuthLayout>
  );
}

export const Route = createFileRoute("/auth/github/success")({
  component: GithubSuccessPage,
});
