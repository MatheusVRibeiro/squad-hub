import { createFileRoute, Link, useSearch } from "@tanstack/react-router";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";

function GithubEmailExistsPage() {
  // /auth/github/email-exists?email=... — o e-mail primário do GitHub já está
  // em uso por outra conta MontesSquad. Por segurança, o backend NÃO vincula
  // automaticamente: o usuário deve entrar na conta existente e conectar o
  // GitHub pelas Configurações.
  const search = useSearch({ strict: false }) as { email?: string };
  const email = typeof search?.email === "string" ? search.email : undefined;

  return (
    <AuthLayout
      title="E-mail já cadastrado"
      subtitle="Já existe uma conta MontesSquad com este e-mail."
      footer={
        <>
          Voltar para o{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            login
          </Link>
        </>
      }
    >
      <div className="space-y-5 text-center">
        <p className="text-sm text-muted-foreground">
          Já existe uma conta MontesSquad com este e-mail
          {email ? (
            <>
              {" "}
              (<span className="font-medium text-foreground">{email}</span>)
            </>
          ) : null}
          . Entre na conta existente e conecte o GitHub nas Configurações para continuar usando o
          login social.
        </p>
        <Button asChild className="h-11 w-full rounded-xl font-semibold shadow-md">
          <Link to="/login">Entrar na minha conta</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/auth/github/email-exists")({
  component: GithubEmailExistsPage,
});
