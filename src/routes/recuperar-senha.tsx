import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/api";

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
});
type FormValues = z.infer<typeof schema>;

function RecuperarSenhaPage() {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await api.post("/recuperar-senha", { email: values.email });
    } catch {
      // Anti-enumeração: resposta genérica idêntica ao sucesso — não revela
      // se o e-mail existe (o backend já se comporta assim; aqui apenas não
      // propagamos erros de forma distinta na UI).
    } finally {
      setSubmitting(false);
    }
    toast.success("Se o e-mail existir, enviaremos um link de redefinição de senha.");
  };

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu e-mail para receber um link de redefinição."
      footer={
        <>
          Lembrou a senha?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="voce@exemplo.com"
            autoComplete="email"
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl font-semibold shadow-md"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de recuperação"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/recuperar-senha")({
  component: RecuperarSenhaPage,
});
