import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, KeyRound, CheckCircle2, RefreshCw } from "lucide-react";
import axios from "axios";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { api } from "@/services/api";

// 1. Schema do E-mail
const emailSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
});
type EmailFormValues = z.infer<typeof emailSchema>;

// 2. Schema da Nova Senha
const senhaSchema = z
  .object({
    novaSenha: z.string().min(6, "Mínimo 6 caracteres").max(72),
    confirmacao: z.string().min(6, "Mínimo 6 caracteres").max(72),
  })
  .refine((values) => values.novaSenha === values.confirmacao, {
    message: "As senhas não conferem",
    path: ["confirmacao"],
  });
type SenhaFormValues = z.infer<typeof senhaSchema>;

type Step = "email" | "codigo" | "senha";

function RecuperarSenhaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tokenReset, setTokenReset] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Temporizador para reenvio de código (60s)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Form 1: Email
  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });

  // Form 2: Nova Senha
  const {
    register: registerSenha,
    handleSubmit: handleSenhaSubmit,
    formState: { errors: senhaErrors },
  } = useForm<SenhaFormValues>({ resolver: zodResolver(senhaSchema) });

  // Submissão do Passo 1: Enviar Código
  const onEnviarEmail = async (values: EmailFormValues) => {
    setSubmitting(true);
    try {
      await api.post("/recuperar-senha", { email: values.email });
      setEmail(values.email);
      setStep("codigo");
      setCountdown(60);
      toast.success("Código de confirmação enviado para seu e-mail!");
    } catch {
      // Anti-enumeração: responde com sucesso visual e avança para a etapa do código
      setEmail(values.email);
      setStep("codigo");
      setCountdown(60);
      toast.success("Se o e-mail existir, enviaremos um código de recuperação.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submissão do Passo 2: Validar Código
  const onVerificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || codigo.length < 6) {
      toast.error("Informe o código completo de 6 dígitos.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/verificar-codigo-recuperacao", {
        email,
        codigo: codigo.trim(),
      });

      const token = response.data?.dados?.token;
      if (token) {
        setTokenReset(token);
        setStep("senha");
        toast.success("Código confirmado com sucesso!");
      } else {
        toast.error("Resposta inesperada do servidor.");
      }
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? ((err.response.data as { message?: string }).message ?? "Código inválido ou expirado")
          : "Código inválido ou expirado";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Reenviar Código
  const onReenviarCodigo = async () => {
    if (countdown > 0 || submitting) return;
    setSubmitting(true);
    try {
      await api.post("/recuperar-senha", { email });
      setCountdown(60);
      toast.success("Novo código enviado com sucesso!");
    } catch {
      toast.error("Não foi possível reenviar o código agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submissão do Passo 3: Salvar Nova Senha
  const onSalvarNovaSenha = async (values: SenhaFormValues) => {
    if (!tokenReset) {
      toast.error("Sessão de recuperação expirada. Inicie o processo novamente.");
      setStep("email");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/resetar-senha", {
        token: tokenReset,
        novaSenha: values.novaSenha,
      });

      toast.success("Senha atualizada com sucesso! Faça login com sua nova credencial.");
      navigate({ to: "/login" });
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? ((err.response.data as { message?: string }).message ?? "Erro ao redefinir a senha")
          : "Erro ao redefinir a senha";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Layout Dinâmico baseado no passo
  if (step === "codigo") {
    return (
      <AuthLayout
        title="Código de confirmação"
        subtitle={`Digite o código de 6 dígitos enviado para ${email}`}
        footer={
          <button
            type="button"
            onClick={() => setStep("email")}
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Alterar e-mail
          </button>
        }
      >
        <form onSubmit={onVerificarCodigo} className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-3 py-2">
            <Label className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Código de 6 dígitos
            </Label>
            
            <InputOTP
              maxLength={6}
              value={codigo}
              onChange={(value) => setCodigo(value)}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-11 text-lg font-bold" />
                <InputOTPSlot index={1} className="h-12 w-11 text-lg font-bold" />
                <InputOTPSlot index={2} className="h-12 w-11 text-lg font-bold" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} className="h-12 w-11 text-lg font-bold" />
                <InputOTPSlot index={4} className="h-12 w-11 text-lg font-bold" />
                <InputOTPSlot index={5} className="h-12 w-11 text-lg font-bold" />
              </InputOTPGroup>
            </InputOTP>

            <p className="text-xs text-muted-foreground text-center">
              O código expira em 15 minutos.
            </p>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-xl font-semibold shadow-md"
            disabled={submitting || codigo.length < 6}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirmar código"
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onReenviarCodigo}
              disabled={countdown > 0 || submitting}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {countdown > 0
                ? `Reenviar código em ${countdown}s`
                : "Não recebeu? Clique para reenviar"}
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  if (step === "senha") {
    return (
      <AuthLayout
        title="Criar nova senha"
        subtitle="Escolha uma nova senha forte para proteger sua conta."
        footer={
          <>
            Lembrou a senha?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </>
        }
      >
        <form onSubmit={handleSenhaSubmit(onSalvarNovaSenha)} className="space-y-5">
          <div className="space-y-1.5">
            <Label
              htmlFor="novaSenha"
              className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
            >
              Nova senha
            </Label>
            <Input
              id="novaSenha"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              autoFocus
              className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
              {...registerSenha("novaSenha")}
            />
            {senhaErrors.novaSenha && (
              <p className="text-xs text-destructive">{senhaErrors.novaSenha.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="confirmacao"
              className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
            >
              Confirmar nova senha
            </Label>
            <Input
              id="confirmacao"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
              {...registerSenha("confirmacao")}
            />
            {senhaErrors.confirmacao && (
              <p className="text-xs text-destructive">{senhaErrors.confirmacao.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-xl font-semibold shadow-md"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Salvar nova senha"
            )}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  // Passo 1 Padrão: E-mail
  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu e-mail para receber um código de verificação."
      footer={
        <>
          Lembrou a senha?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleEmailSubmit(onEnviarEmail)} className="space-y-5">
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
            autoFocus
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...registerEmail("email")}
          />
          {emailErrors.email && <p className="text-xs text-destructive">{emailErrors.email.message}</p>}
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl font-semibold shadow-md"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código de confirmação"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/recuperar-senha/")({
  component: RecuperarSenhaPage,
});
