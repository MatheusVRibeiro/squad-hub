import { useState } from "react";
import { Check, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const RATING_LABELS: Record<number, string> = {
  1: "1 — Abaixo das expectativas",
  2: "2 — Regular",
  3: "3 — Bom",
  4: "4 — Muito bom",
  5: "5 — Excelente",
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
      toast.error("Selecione uma nota de 1 a 5.");
      return;
    }

    setSubmitting(true);
    try {
      await enviarAvaliacaoMembro(projectId, {
        avaliado_id: Number(selectedMember.id),
        nota,
        comentario: comentario.trim() || undefined,
      });

      toast.success(`Avaliação registrada para ${selectedMember.name}.`);
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
      {/* Resumo da Seção */}
      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3.5 text-sm text-foreground shadow-xs">
        <MessageSquareText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">Avaliações do Projeto</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Registre seu feedback sobre a colaboração e as entregas dos membros deste squad.
            Cada participante pode ser avaliado uma única vez.
          </p>
        </div>
      </div>

      {/* Seção 1: Membros Disponíveis para Avaliação */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Membros da Equipe
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const isSelf = currentUserId != null && Number(m.id) === Number(currentUserId);
            const alreadyReviewed = reviewedMemberIds.includes(Number(m.id));

            return (
              <Card
                key={m.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border-border/60 p-4 shadow-xs"
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

                {/* Ação */}
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
                      variant="outline"
                      className="rounded-xl h-8 px-3 text-xs font-semibold hover:border-primary hover:text-primary cursor-pointer"
                      onClick={() => {
                        setSelectedMember(m);
                        setNota(5);
                        setComentario("");
                        setModalOpen(true);
                      }}
                    >
                      Avaliar
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Seção 2: Histórico de Avaliações */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Feedbacks Registrados ({avaliacoes.length})
        </h3>

        {avaliacoes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
            Nenhuma avaliação foi registrada neste projeto até o momento.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {avaliacoes.map((rev) => (
              <Card key={rev.id} className="rounded-2xl border-border/60 p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-medium text-foreground">
                    <span className="font-semibold">{rev.avaliador_nome}</span>
                    <span className="text-muted-foreground mx-1">avaliou</span>
                    <span className="font-semibold text-primary">{rev.avaliado_nome}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5">
                    Nota {rev.nota}/5
                  </Badge>
                </div>
                {rev.comentario && (
                  <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-xl p-2.5">
                    {rev.comentario}
                  </p>
                )}
                <div className="text-[10px] text-muted-foreground text-right">
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

      {/* Modal Formal de Avaliação */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avaliação de Participante</DialogTitle>
            <DialogDescription>
              Atribua uma nota de desempenho e adicione um feedback sobre a atuação de{" "}
              <strong>{selectedMember?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Nota de Desempenho (1 a 5)</Label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNota(val)}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      nota === val
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/20 border-border/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                {RATING_LABELS[nota]}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="review-comentario" className="text-xs font-semibold text-foreground">
                Comentário ou justificativa (opcional)
              </Label>
              <Textarea
                id="review-comentario"
                placeholder="Descreva pontos positivos, pontualidade nas entregas e colaboração em equipe..."
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
              className="rounded-xl font-semibold cursor-pointer"
            >
              {submitting ? "Salvando..." : "Salvar Avaliação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
