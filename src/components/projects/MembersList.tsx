import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Member } from "@/services/projectDetail";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MembersList({ members }: { members: Member[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <Card key={m.id} className="flex items-center gap-3 rounded-2xl border-border/60 p-4">
          <Avatar className="h-11 w-11 border">
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials(m.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{m.name}</p>
              {m.role === "Owner" && (
                <Badge variant="outline" className="rounded-full text-[10px]">
                  Owner
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {/* ETAPA 6: função do membro no squad (JOIN com funcoes do backend). */}
              {m.funcao_nome && (
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/30 bg-primary/5 text-[10px] text-primary"
                >
                  {m.funcao_nome}
                </Badge>
              )}
              {/* ETAPA 6: membro que entrou por uma vaga do projeto. */}
              {m.vaga_id != null && (
                <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
                  {m.vaga_nome ? `Vaga: ${m.vaga_nome}` : "Via vaga"}
                </Badge>
              )}
              {m.skills.map((s) => (
                <Badge key={s} variant="secondary" className="rounded-full text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
