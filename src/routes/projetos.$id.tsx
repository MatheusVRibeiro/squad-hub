import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import { motion } from "framer-motion";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { Mural } from "@/components/projects/Mural";
import { MembersList } from "@/components/projects/MembersList";
import { Applications } from "@/components/projects/Applications";
import { fetchProjectDetail } from "@/services/projectDetail";

function ProjectDetailPage() {
  const { id } = useParams({ from: "/projetos/$id" });
  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProjectDetail(id),
  });

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit rounded-xl">
            <Link to="/projetos">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para projetos
            </Link>
          </Button>

          {isLoading || !data ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-9 w-72 rounded-xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden rounded-2xl border-border/60">
                  <div className="h-2 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
                  <CardContent className="space-y-4 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Projeto
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                          {data.name}
                        </h1>
                      </div>
                      <Badge variant="outline" className="rounded-full">
                        {data.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{data.longDescription}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.technologies.map((t) => (
                        <Badge key={t} variant="secondary" className="rounded-full text-[11px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> {data.membersCount}/{data.membersLimit}{" "}
                        membros
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />{" "}
                        {new Date(data.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      <span>Criado por {data.createdBy}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <Tabs defaultValue="kanban" className="space-y-4">
                <TabsList className="flex w-full justify-start overflow-x-auto rounded-xl">
                  <TabsTrigger value="kanban">Kanban</TabsTrigger>
                  <TabsTrigger value="mural">Mural</TabsTrigger>
                  <TabsTrigger value="membros">Membros</TabsTrigger>
                  <TabsTrigger value="candidaturas">
                    Candidaturas
                    {data.applications.filter((a) => a.status === "pending").length > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 rounded-full px-1.5 text-[10px]">
                        {data.applications.filter((a) => a.status === "pending").length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="kanban">
                  <KanbanBoard initial={data.tasks} />
                </TabsContent>
                <TabsContent value="mural">
                  <Mural initial={data.messages} />
                </TabsContent>
                <TabsContent value="membros">
                  <MembersList members={data.members} />
                </TabsContent>
                <TabsContent value="candidaturas">
                  <Applications initial={data.applications} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/projetos/$id")({
  component: ProjectDetailPage,
});