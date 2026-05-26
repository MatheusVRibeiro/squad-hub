import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createProject } from "@/services/projectDetail";

const schema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres").max(80),
  description: z.string().min(10, "Descreva com pelo menos 10 caracteres").max(500),
  membersLimit: z.coerce.number().int().min(2, "Mínimo 2").max(20, "Máximo 20"),
});

type FormValues = z.infer<typeof schema>;

function NovoProjetoPage() {
  const navigate = useNavigate();
  const [techs, setTechs] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", membersLimit: 5 },
  });

  function addTech(value: string) {
    const v = value.trim();
    if (!v || techs.includes(v)) return;
    setTechs((arr) => [...arr, v]);
    setDraft("");
  }

  async function onSubmit(values: FormValues) {
    if (techs.length === 0) {
      toast.error("Adicione pelo menos uma tecnologia");
      return;
    }
    try {
      const created = await createProject({ ...values, technologies: techs });
      toast.success("Projeto criado");
      navigate({ to: "/projetos/$id", params: { id: created.id } });
    } catch {
      toast.error("Não foi possível criar o projeto");
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Criar projeto</h1>
            <p className="text-sm text-muted-foreground">
              Defina escopo, stack e tamanho do squad. Você será o owner.
            </p>
          </div>

          <Card className="rounded-2xl border-border/60">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do projeto</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: API de Pagamentos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder="O que o squad vai construir e qual o objetivo?"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>Tecnologias</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTech(draft);
                          }
                        }}
                        placeholder="React, Node.js, Docker..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addTech(draft)}
                        className="rounded-xl"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {techs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {techs.map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="cursor-pointer rounded-full text-[11px]"
                            onClick={() => setTechs((arr) => arr.filter((x) => x !== t))}
                          >
                            {t}
                            <X className="ml-1 h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="membersLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tamanho do squad</FormLabel>
                        <FormControl>
                          <Input type="number" min={2} max={20} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate({ to: "/projetos" })}
                      className="rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="rounded-xl"
                    >
                      {form.formState.isSubmitting && (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      )}
                      Criar projeto
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/projetos/novo")({
  component: NovoProjetoPage,
});