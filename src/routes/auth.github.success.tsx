import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

function GithubSuccessPage() {
  // /auth/github/success?token=... — o callback do backend redireciona para cá
  // quando a conta GitHub já está vinculada (login direto).
  const search = useSearch({ strict: false }) as { token?: string };
  const token = typeof search?.token === "string" ? search.token : undefined;

  const { signInWithGithubToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    signInWithGithubToken(token)
      .then(() => navigate({ to: "/dashboard", replace: true }))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Não foi possível entrar com o GitHub.");
      });
  }, [token, signInWithGithubToken, navigate]);

  const failed = !token || error;

  return (
    <AuthLayout
      title={error ? "Não foi possível entrar" : !token ? "Link inválido" : "Entrando..."}
      subtitle={
        error
          ? "Ocorreu um erro ao concluir o login com GitHub."
          : !token
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
