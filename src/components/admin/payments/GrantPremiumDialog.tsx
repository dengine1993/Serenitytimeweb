import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";

interface UserHit {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PRESETS = [7, 30, 90, 365];

export function GrantPremiumDialog({ open, onOpenChange, onSuccess }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserHit | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery(""); setResults([]); setSelected(null); setDays(30);
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .or(`display_name.ilike.%${query}%,username.ilike.%${query}%,user_id.ilike.%${query}%`)
          .limit(10);
        if (error) throw error;
        setResults((data as UserHit[]) ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const submit = async () => {
    if (!selected || days <= 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-payments", {
        body: { mode: "grant", userId: selected.user_id, days, plan: "premium" },
      });
      if (error) throw error;
      toast.success(`Премиум выдан на ${days} дн.`);
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка выдачи");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Выдать премиум вручную</DialogTitle>
          <DialogDescription>Найдите пользователя и выберите длительность.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selected ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Имя, username или user_id"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {searching && (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {!searching && results.length === 0 && query.length >= 2 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Ничего не найдено</p>
                )}
                {results.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => setSelected(u)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback>{(u.display_name ?? "?").slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.display_name ?? "Без имени"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.username ? `@${u.username}` : u.user_id.slice(0, 8) + "…"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selected.avatar_url ?? undefined} />
                  <AvatarFallback>{(selected.display_name ?? "?").slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{selected.display_name ?? "Без имени"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selected.username ? `@${selected.username}` : selected.user_id}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Сменить</Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESETS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={days === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDays(d)}
                  >
                    {d} дн
                  </Button>
                ))}
              </div>
              <div>
                <Label htmlFor="grant-days">Произвольно (дней)</Label>
                <Input
                  id="grant-days"
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Закрыть</Button>
          <Button onClick={submit} disabled={loading || !selected || days <= 0}>
            {loading ? "…" : "Выдать премиум"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
