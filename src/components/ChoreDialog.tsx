import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { WaterChore, toLocalDateOnly, addDaysLocalStr } from "@/lib/chores";
import { Droplets, Leaf } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type Props = {
  chore: WaterChore | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

export function ChoreDialog({ chore, onOpenChange, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const open = !!chore;

  const markWatered = async (withNutrients: boolean) => {
    if (!chore) return;
    setBusy(true);
    const today = toLocalDateOnly(new Date());
    const { error } = await supabase.from("plant_events").insert({
      plant_id: chore.plant.id,
      event_at: today,
      label: withNutrients ? "Vattnad m. näring" : "Vattnad",
      note: null,
      image_url: null,
    });
    // Rensa eventuell snooze
    await supabase.from("plants").update({ water_snooze_until: null }).eq("id", chore.plant.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${chore.plant.name} är vattnad 💧`);
    onOpenChange(false);
    onDone();
  };

  const snooze = async (days: number) => {
    if (!chore) return;
    setBusy(true);
    const until = addDaysLocalStr(new Date(), days);
    const { error } = await supabase.from("plants").update({ water_snooze_until: until }).eq("id", chore.plant.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Uppskjuten ${days} ${days === 1 ? "dag" : "dagar"}`);
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" /> {chore?.plant.name}
          </DialogTitle>
        </DialogHeader>

        {chore && (
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
              {chore.plant.image_url ? (
                <img src={chore.plant.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><Leaf className="h-6 w-6 text-accent" /></div>
              )}
            </div>
            <div className="min-w-0 text-sm">
              {chore.plant.room && <div className="truncate text-muted-foreground">{chore.plant.room}</div>}
              <div>
                {chore.daysOverdue === 0
                  ? "Ska vattnas idag"
                  : chore.daysOverdue > 0
                  ? `${chore.daysOverdue} ${chore.daysOverdue === 1 ? "dag" : "dagar"} sen`
                  : "Snart dags"}
              </div>
            </div>
          </div>
        )}

        {chore && (
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            chore.shouldGetNutrients
              ? "bg-amber-100 text-amber-900"
              : "bg-primary/10 text-primary"
          }`}>
            <span>{chore.shouldGetNutrients ? "🧪" : "💧"}</span>
            <span>{chore.shouldGetNutrients ? "Dags för näring den här gången" : "Vanlig vattning — näring nästa gång"}</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => markWatered(false)}
              disabled={busy}
              variant={chore?.shouldGetNutrients ? "secondary" : "default"}
            >
              💧 Vattnad
            </Button>
            <Button
              onClick={() => markWatered(true)}
              disabled={busy}
              variant={chore?.shouldGetNutrients ? "default" : "secondary"}
            >
              🧪 + näring
            </Button>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Skjut upp</div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => snooze(1)} disabled={busy}>1 dag</Button>
              <Button variant="outline" onClick={() => snooze(2)} disabled={busy}>2 dagar</Button>
              <Button variant="outline" onClick={() => snooze(3)} disabled={busy}>3 dagar</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Stäng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
