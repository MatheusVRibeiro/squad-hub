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
import { Label } from "@/components/ui/label";
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
  membersLimit: z.number().int().min(2, "Mínimo 2").max(20, "Máximo 20"),
});

type FormValues = z.infer<typeof schema>;

import { useQueryClient } from "@tanstack/react-query";

// ... inside component ...

function NovoProjetoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      // Invalida a query de projetos para atualizar a lista imediatamente
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projetos/$id", params: { id: created.id } });
    } catch {
      toast.error("Não foi possível criar o projeto");
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-2xl space-y-8 py-4">
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">Workspace</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Criar novo projeto</h1>
            <p className="text-sm text-muted-foreground max-w-md">
              Defina escopo, stack de tecnologias e o tamanho ideal do squad. Como criador, você será o proprietário.
            </p>
          </div>

          <Card className="rounded-3xl border border-border/50 bg-card/65 shadow-xl backdrop-blur-md">
            <CardContent className="p-6 sm:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Nome do projeto</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: API de Pagamentos" className="h-11 rounded-xl border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Descrição curta</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="O que o squad vai construir e qual o objetivo principal?"
                            className="rounded-xl border-border/60 bg-background/40 p-4 focus-visible:ring-primary/20 text-sm resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Tecnologias necessárias</Label>
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
                        placeholder="React, Node.js, Docker... (Pressione Enter para adicionar)"
                        className="h-11 rounded-xl border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addTech(draft)}
                        className="h-11 w-11 rounded-xl border-border/60 flex items-center justify-center shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {techs.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {techs.map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide border bg-muted/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all flex items-center gap-1"
                            onClick={() => setTechs((arr) => arr.filter((x) => x !== t))}
                            title="Clique para remover"
                          >
                            {t}
                            <X className="h-3 w-3 shrink-0" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="membersLimit"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Tamanho limite do squad</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2}
                            max={20}
                            className="h-11 rounded-xl border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm w-32"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate({ to: "/projetos" })}
                      className="rounded-xl px-5 text-xs font-medium"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="rounded-xl px-6 text-xs font-semibold shadow-md"
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