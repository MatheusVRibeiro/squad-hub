import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Compass, FolderKanban, Settings, User } from "lucide-react";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const tiles = [
  { icon: Compass, label: "Explorar Projetos", hint: "Descubra squads abertos", to: "/projetos" },
  { icon: FolderKanban, label: "Meus Projetos", hint: "Gerencie seus squads", to: "/meus-projetos" },
  { icon: User, label: "Meu Perfil", hint: "Reputação e skills", to: "/perfil" },
  { icon: Settings, label: "Configurações", hint: "Preferências da conta", to: "/configuracoes" },
] as const;

function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Bem-vindo de volta</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Olá, {user?.name?.split(" ")[0] ?? "dev"} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              A estrutura base e a autenticação estão prontas. Avance para os próximos passos quando
              quiser.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile, i) => (
              <motion.div
                key={tile.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3 }}
              >
                <Link to={tile.to} className="block">
                  <Card className="group h-full cursor-pointer rounded-2xl border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    <CardContent className="flex items-start gap-4 p-6">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <tile.icon className="h-5 w-5" />
                      </span>
                      <div className="space-y-1">
                        <p className="font-medium">{tile.label}</p>
                        <p className="text-xs text-muted-foreground">{tile.hint}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});