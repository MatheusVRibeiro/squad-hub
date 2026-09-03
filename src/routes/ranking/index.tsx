import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GitCommitHorizontal, Trophy } from "lucide-react";
import { useState } from "react";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import {
  getGlobalCommitters,
  getGlobalContributors,
  type Committer,
  type Contributor,
} from "@/services/rankings";

type RankingSearch = { tab?: "contributors" | "committers" };

function RankingRow({
  rank,
  name,
  githubLogin,
  avatarUrl,
  metric,
  metricLabel,
}: {
  rank: number;
  name: string;
  githubLogin: string | null;
  avatarUrl: string | null;
  metric: number;
  metricLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 px-3 py-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {rank}
      </span>
      <Avatar className="h-8 w-8">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {githubLogin && (
          <p className="truncate text-[11px] text-muted-foreground">@{githubLogin}</p>
        )}
      </div>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-foreground">{metric}</span>
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
          {metricLabel}
        </span>
      </span>
    </div>
  );
}

function RankingList({
  contributors,
  committers,
  contributorsLoading,
  committersLoading,
  contributorsError,
  committersError,
  onRetry,
}: {
  contributors: Contributor[];
  committers: Committer[];
  contributorsLoading: boolean;
  committersLoading: boolean;
  contributorsError: boolean;
  committersError: boolean;
  onRetry: () => void;
}) {
  if (contributorsLoading || committersLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (contributorsError || committersError) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 p-8 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium">Não foi possível carregar o ranking global.</p>
        <button
          onClick={onRetry}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <RefreshCcw className="h-3 w-3" /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contributors.map((c, i) => (
        <RankingRow
          key={c.userId ?? c.githubLogin ?? `c-${i}`}
          rank={i + 1}
          name={c.name}
          githubLogin={c.githubLogin}
          avatarUrl={c.avatarUrl}
          metric={c.score}
          metricLabel="score"
        />
      ))}
      {committers.map((c, i) => (
        <RankingRow
          key={c.userId ?? c.githubLogin ?? `m-${i}`}
          rank={i + 1}
          name={c.name}
          githubLogin={c.githubLogin}
          avatarUrl={c.avatarUrl}
          metric={c.commitCount}
          metricLabel="commits"
        />
      ))}
      {contributors.length === 0 && committers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
          Nenhuma contribuição registrada ainda. Conecte o GitHub e comece a contribuir!
        </div>
      )}
    </div>
  );
}

function RankingPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<"contributors" | "committers">(
    search.tab === "committers" ? "committers" : "contributors",
  );

  const contributorsQuery = useQuery({
    queryKey: ["rankings", "contributors", "global", "all"],
    queryFn: () => getGlobalContributors(10, "all"),
    staleTime: 60_000,
  });
  const committersQuery = useQuery({
    queryKey: ["rankings", "committers", "global", "all"],
    queryFn: () => getGlobalCommitters(10, "all"),
    staleTime: 60_000,
  });

  const handleTabChange = (value: string) => {
    const next = value as "contributors" | "committers";
    setTab(next);
    navigate({ to: "/ranking", search: { tab: next } });
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Ranking global</h1>
              <p className="text-sm text-muted-foreground">
                Top contribuidores e committers da comunidade MonteSquad.
              </p>
            </div>
          </div>

          <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="flex w-full justify-start overflow-x-auto rounded-xl">
              <TabsTrigger value="contributors">
                <Trophy className="mr-1.5 h-3.5 w-3.5" /> Top Contributors
              </TabsTrigger>
              <TabsTrigger value="committers">
                <GitCommitHorizontal className="mr-1.5 h-3.5 w-3.5" /> Top Committers
              </TabsTrigger>
            </TabsList>
            <TabsContent value="contributors" className="space-y-4">
              <Card className="rounded-3xl border-border/60 bg-card shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <RankingList
                    contributors={contributorsQuery.data ?? []}
                    committers={[]}
                    contributorsLoading={contributorsQuery.isLoading}
                    committersLoading={false}
                    contributorsError={contributorsQuery.isError}
                    committersError={false}
                    onRetry={() => contributorsQuery.refetch()}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="committers" className="space-y-4">
              <Card className="rounded-3xl border-border/60 bg-card shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <RankingList
                    contributors={[]}
                    committers={committersQuery.data ?? []}
                    contributorsLoading={false}
                    committersLoading={committersQuery.isLoading}
                    contributorsError={false}
                    committersError={committersQuery.isError}
                    onRetry={() => committersQuery.refetch()}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/ranking/")({
  validateSearch: (search: Record<string, unknown>): RankingSearch => ({
    tab: search.tab === "committers" ? "committers" : "contributors",
  }),
  component: RankingPage,
});
