import { useState } from "react";
import { Star, Check, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { enviarAvaliacaoMembro, type Member } from "@/services/projectDetail";

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
  isProjectClosed?: boolean;
  currentUserId?: number;
  isMemberOrOwner?: boolean;
  reviewedMemberIds?: number[];
  onReviewSubmitted?: () => void;
}

export function MembersList({
  members,
  projectId,
  isProjectClosed = false,
  currentUserId,
  isMemberOrOwner = false,
  reviewedMemberIds = [],
  onReviewSubmitted,
}: MembersListProps) {
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSendReview() {
    if (!targetMember || !projectId) return;

    setIsSubmitting(true);
    try {
      await enviarAvaliacaoMembro(projectId, {
        avaliado_id: Number(targetMember.id),
        nota: rating,
        comentario: comment.trim() || undefined,
      });

      toast.success(`Avaliação enviada para ${targetMember.name}!`);
      setTargetMember(null);
      setComment("");
      setRating(5);
      onReviewSubmitted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canReview = isProjectClosed && isMemberOrOwner && Boolean(projectId);

  return (
    <div className="space-y-4">
      {canReview && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 shadow-sm backdrop-blur-sm dark:text-amber-300">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400 shrink-0" />
          <span>
            <strong>Projeto finalizado!</strong> Avalie seus colegas de equipe para fortalecer a reputação deles na comunidade. Você pode avaliar cada participante uma única vez.
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => {
          const isSelf = currentUserId != null && Number(m.id) === Number(currentUserId);
          const alreadyReviewed = reviewedMemberIds.includes(Number(m.id));

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

              {/* Ação de Avaliação (quando o projeto está encerrado e usuário é membro) */}
              {canReview && !isSelf && (
                <div className="mt-2 flex items-center justify-end border-t border-border/40 pt-2.5">
                  {alreadyReviewed ? (
                    <Badge
                      variant="outline"
                      className="gap-1 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                    >
                      <Check className="h-3 w-3 stroke-[3]" /> Avaliado
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTargetMember(m);
                        setRating(5);
                        setComment("");
                      }}
                      className="h-8 gap-1.5 rounded-xl border-amber-500/30 text-xs font-semibold text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      Avaliar colega
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Modal de Avaliação do Colega */}
      <Dialog open={targetMember !== null} onOpenChange={(open) => !open && setTargetMember(null)}>
        <DialogContent className="max-w-md rounded-3xl border border-border/60 p-6 shadow-2xl backdrop-blur">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Avaliar {targetMember?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Dê sua nota e feedback para o colega sobre a participação neste projeto. Cada membro só pode ser avaliado uma vez.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Seletor de Estrelas */}
            <div className="space-y-1.5 text-center sm:text-left">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nota de desempenho e colaboração
              </Label>
              <div className="flex items-center justify-center gap-1.5 pt-1 sm:justify-start">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating ?? rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="cursor-pointer p-1 transition-transform hover:scale-115 focus:outline-hidden"
                      aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={cn(
                          "h-7 w-7 transition-colors",
                          active
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted-foreground/30",
                        )}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-sm font-bold text-foreground">
                  {hoverRating ?? rating} / 5
                </span>
              </div>
            </div>

            {/* Campo de Comentário */}
            <div className="space-y-1.5">
              <Label htmlFor="review-comment" className="text-xs font-semibold">
                Comentário ou feedback (opcional)
              </Label>
              <Textarea
                id="review-comment"
                placeholder="Conte como foi trabalhar com essa pessoa, pontualidade, comunicação, etc."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                className="min-h-24 resize-none rounded-xl text-sm"
              />
              <p className="text-right text-[10px] text-muted-foreground">
                {comment.length}/500 caracteres
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setTargetMember(null)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSendReview}
              className="rounded-xl text-xs font-semibold shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Avaliação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
