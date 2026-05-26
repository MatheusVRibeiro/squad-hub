import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";

function PerfilPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Você</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meu perfil</h1>
          </div>
          <Card className="rounded-2xl border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold">Em construção</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Reputação, skills e histórico chegam no Passo 7.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
});