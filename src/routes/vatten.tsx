import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, Droplets, Check } from "lucide-react";
import { validateGuestToken, getGuestPlants, getGuestWatering, waterPlantAsGuest } from "@/lib/guest";
import { computeWaterChores, WaterChore } from "@/lib/chores";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type VattenSearch = { token: string };

export const Route = createFileRoute("/vatten")({
  head: () => ({ meta: [{ title: "Växtpassning" }] }),
  validateSearch: (search: Record<string, unknown>): VattenSearch => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: VattenPage,
});

type PageState = "loading" | "invalid" | "expired" | "ready";

function VattenPage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<PageState>("loading");
  const [inviteLabel, setInviteLabel] = useState<string | null>(null);
  const [chores, setChores] = useState<WaterChore[]>([]);
  const [activeChore, setActiveChore] = useState<WaterChore | null>(null);
  const [note, setNote] = useState("");
  const [watering, setWatering] = useState(false);

  const load = async () => {
    if (!token) { setState("invalid"); return; }
    setState("loading");
    try {
      const validation = await validateGuestToken(token);
      setInviteLabel(validation.label);
      if (!validation.valid) {
        setState(validation.reason === "expired" ? "expired" : "invalid");
        return;
      }
      const [plants, watering] = await Promise.all([
        getGuestPlants(token),
        getGuestWatering(token),
      ]);
      setChores(computeWaterChores(plants, watering));
      setState("ready");
    } catch {
      setState("invalid");
    }
  };

  useEffect(() => { load(); }, [token]);

  const handleWater = async (label: "Vattnad" | "Vattnad m. näring") => {
    if (!activeChore) return;
    setWatering(true);
    try {
      await waterPlantAsGuest(token, activeChore.plant.id, label, note.trim() || undefined);
      toast.success(`${activeChore.plant.name} vattnad!`);
      setActiveChore(null);
      setNote("");
      load();
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setWatering(false);
    }
  };

  const closeDialog = () => { setActiveChore(null); setNote(""); };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Växtpassning</h1>
              {inviteLabel && (
                <p className="text-xs text-muted-foreground">{inviteLabel}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6">
        {state === "loading" && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary/50" />
            ))}
          </div>
        )}

        {state === "invalid" && (
          <div className="mt-16 text-center">
            <h2 className="text-lg font-medium">Ogiltig inbjudan</h2>
            <p className="mt-1 text-sm text-muted-foreground">Den här länken verkar inte stämma.</p>
          </div>
        )}

        {state === "expired" && (
          <div className="mt-16 text-center">
            <h2 className="text-lg font-medium">Inbjudan har gått ut</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {inviteLabel ? `"${inviteLabel}" är` : "Den här inbjudan är"} inte längre aktiv. Be om en ny länk.
            </p>
          </div>
        )}

        {state === "ready" && chores.length === 0 && (
          <div className="mt-12 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-medium">Allt klart!</h2>
            <p className="mt-1 text-sm text-muted-foreground">Inga växter behöver vatten just nu.</p>
          </div>
        )}

        {state === "ready" && chores.length > 0 && (
          <ul className="space-y-2">
            {chores.map((c) => (
              <li key={c.plant.id}>
                <button
                  onClick={() => setActiveChore(c)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-sm ring-1 ring-border transition active:scale-[0.99]"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {c.plant.image_url ? (
                      <img src={c.plant.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Leaf className="h-6 w-6 text-accent" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.plant.name}</div>
                    {c.plant.room && (
                      <div className="truncate text-xs text-muted-foreground">{c.plant.room}</div>
                    )}
                  </div>
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.daysOverdue >= 2
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/15 text-primary"
                  }`}>
                    <Droplets className="h-3.5 w-3.5" />
                    {c.daysOverdue === 0
                      ? "Dags idag"
                      : c.daysOverdue === 1
                      ? "1 dag försenad"
                      : `${c.daysOverdue} dagar försenad`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialog open={!!activeChore} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeChore?.plant.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anteckning (valfritt)"
              rows={2}
              className="resize-none rounded-xl"
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => handleWater("Vattnad")} disabled={watering} className="w-full">
              <Droplets className="mr-1.5 h-4 w-4" /> Vattnad
            </Button>
            <Button
              variant="outline"
              onClick={() => handleWater("Vattnad m. näring")}
              disabled={watering}
              className="w-full"
            >
              <Droplets className="mr-1.5 h-4 w-4" /> Vattnad med näring
            </Button>
            <Button variant="ghost" onClick={closeDialog} className="w-full">
              Avbryt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
