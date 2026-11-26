import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { type Member } from "@/services/projectDetail";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface MembersListProps {
  members: Member[];
  projectId?: string;
  currentUserId?: number;
}

export function MembersList({
  members,
  currentUserId,
}: MembersListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => {
        const isSelf = currentUserId != null && Number(m.id) === Number(currentUserId);

        return (
          <Card
            key={m.id}
            className="flex flex-col justify-between gap-3 rounded-2xl border-border/60 p-4"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 border shrink-0">
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
                  {isSelf && (
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      Você
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.funcao_nome && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/30 bg-primary/5 text-[10px] text-primary"
                    >
                      {m.funcao_nome}
                    </Badge>
                  )}
                  {m.vaga_id != null && (
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px] text-muted-foreground"
                    >
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
            </div>
          </Card>
        );
      })}
    </div>
  );
}
