import { useState } from "react";
import { Star, Check, MessageSquareText, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  enviarAvaliacaoMembro,
  type Member,
  type ProjectReviewsData,
} from "@/services/projectDetail";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Props = {
  projectId: string;
  members: Member[];
  currentUserId?: number;
  isMemberOrOwner: boolean;
  reviewsData?: ProjectReviewsData;
  onReviewSubmitted: () => void;
};

export function ProjectEvaluationsTab({
  projectId,
  members,
  currentUserId,
  isMemberOrOwner,
  reviewsData,
  onReviewSubmitted,
}: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [nota, setNota] = useState<number>(5);
  const [comentario, setComentario] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const reviewedMemberIds = reviewsData?.avaliadosPorMim ?? [];
  const avaliacoes = reviewsData?.avaliacoes ?? [];

  async function handleSubmitReview() {
    if (!selectedMember) return;
    if (nota < 1 || nota > 5) {
      toast.error("Selecione uma nota de 1 a 5 estrelas.");
      return;
    }

    setSubmitting(true);
    try {
      await enviarAvaliacaoMembro(projectId, {
        avaliado_id: Number(selectedMember.id),
        nota,
        comentario: comentario.trim() || undefined,
      });

      toast.success(`Avaliação enviada para ${selectedMember.name}!`);
      setModalOpen(false);
      setSelectedMember(null);
      setNota(5);
      setComentario("");
      onReviewSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar avaliação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner de Orientação */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5 text-sm text-amber-800 shadow-sm backdrop-blur-sm dark:text-amber-300">
        <Star className="h-5 w-5 fill-amber-400 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">Avaliação 360 do Squad — Projeto Finalizado</p>
          <p className="text-xs text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
            Avalie os colegas com quem você colaborou para fortalecer a reputação técnica deles na comunidade.
            Você pode avaliar cada membro do squad uma única vez (de 1 a 5 estrelas com comentário).
          </p>
        </div>
      </div>

      {/* Seção 1: Membros Disponíveis para Avaliação */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Participantes do Squad
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const isSelf = currentUserId != null && Number(m.id) === Number(currentUserId);
            const alreadyReviewed = reviewedMemberIds.includes(Number(m.id));

            return (
              <Card
                key={m.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border-border/60 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 border shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground/90">{m.name}</p>
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
                      {m.skills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="rounded-full text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ação de Avaliar */}
                <div className="mt-2 flex items-center justify-end border-t border-border/40 pt-2.5">
                  {isSelf ? (
                    <span className="text-[11px] text-muted-foreground italic">Seu perfil</span>
                  ) : alreadyReviewed ? (
                    <Badge
                      variant="outline"
                      className="gap-1 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                    >
                      <Check className="h-3 w-3 stroke-[3]" /> Avaliado
                    </Badge>
                  ) : isMemberOrOwner ? (
                    <Button
                      size="sm"
                      className="rounded-xl h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
                      onClick={() => {
                        setSelectedMember(m);
                        setNota(5);
                        setComentario("");
                        setModalOpen(true);
                      }}
                    >
                      <Star className="mr-1 h-3.5 w-3.5 fill-white" /> Avaliar Membro
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Seção 2: Histórico de Avaliações Realizadas no Projeto */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Avaliações Registradas ({avaliacoes.length})
          </h3>
        </div>

        {avaliacoes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
            <MessageSquareText className="mx-auto h-8 w-8 opacity-40 mb-2" />
            Nenhuma avaliação foi registrada neste projeto ainda. Seja o primeiro a avaliar um colega!
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {avaliacoes.map((rev) => (
              <Card key={rev.id} className="rounded-2xl border-border/60 p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-foreground">
                    <span>{rev.avaliador_nome}</span>
                    <span className="text-muted-foreground font-normal mx-1">avaliou</span>
                    <span className="text-primary">{rev.avaliado_nome}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < rev.nota ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {rev.comentario && (
                  <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/20 rounded-xl p-2.5">
                    "{rev.comentario}"
                  </p>
                )}
                <div className="text-[10px] text-muted-foreground/80 text-right">
                  {new Date(rev.criado_em).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Avaliação */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avaliar Participante</DialogTitle>
            <DialogDescription>
              Atribua uma nota de 1 a 5 estrelas e deixe um feedback sobre a contribuição de{" "}
              <strong>{selectedMember?.name}</strong> neste squad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nota (1 a 5 estrelas)</Label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNota(star)}
                    className="p-1 rounded-lg transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= nota
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30 hover:text-amber-400"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-amber-600 dark:text-amber-400">
                  {nota} / 5
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="review-comentario" className="text-xs font-semibold">
                Comentário / Feedback (opcional)
              </Label>
              <Textarea
                id="review-comentario"
                placeholder="Ex: Excelente comunicação, entregou as tarefas dentro do prazo e ajudou o time..."
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={500}
                className="min-h-24 resize-none rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="rounded-xl cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={handleSubmitReview}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold cursor-pointer"
            >
              {submitting ? "Enviando..." : "Confirmar Avaliação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
