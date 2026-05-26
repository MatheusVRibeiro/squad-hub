import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

function PerfilPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "MS";

  function addSkill(value: string) {
    const v = value.trim();
    if (!v || skills.includes(v)) return;
    setSkills((arr) => [...arr, v]);
    setDraft("");
  }

  async function save() {
    setSaving(true);
    try {
      const stored = localStorage.getItem("@montesquad:user");
      const next = { ...(stored ? JSON.parse(stored) : {}), name, bio, location, skills };
      localStorage.setItem("@montesquad:user", JSON.stringify(next));
      await new Promise((r) => setTimeout(r, 400));
      toast.success("Perfil atualizado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Você</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meu perfil</h1>
          </div>

          <Card className="overflow-hidden rounded-2xl border-border/60">
            <div className="h-20 bg-gradient-to-r from-primary via-primary/60 to-primary/30" />
            <CardContent className="-mt-10 space-y-6 p-6">
              <div className="flex items-end gap-4">
                <Avatar className="h-20 w-20 border-4 border-background">
                  <AvatarFallback className="bg-primary/10 text-lg text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    placeholder="São Paulo, BR"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  placeholder="Conte um pouco sobre você e o que gosta de construir."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill(draft);
                      }
                    }}
                    placeholder="React, Node.js, Figma..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addSkill(draft)}
                    className="rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="cursor-pointer rounded-full text-[11px]"
                        onClick={() => setSkills((arr) => arr.filter((x) => x !== s))}
                      >
                        {s}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving} className="rounded-xl">
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Salvar alterações
                </Button>
              </div>
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