import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePlantStatus, Plant, PlantStatus } from "@/lib/plants";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant;
  targetStatus: Extract<PlantStatus, 'deceased' | 'rehomed'>;
  onSaved: () => void;
};

export function PlantStatusDialog({ open, onOpenChange, plant, targetStatus, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const isDeceased = targetStatus === "deceased";

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePlantStatus(plant.id, targetStatus, date || null, note.trim() || null);
      toast.success(
        isDeceased
          ? `${plant.name} har lagts till i Minneslund.`
          : `${plant.name} har markerats som utflyttad.`,
      );
      onOpenChange(false);
      setNote("");
      onSaved();
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isDeceased ? "Lägg till i Minneslund" : "Markera som utflyttad"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {isDeceased
              ? `Vila i frid, ${plant.name}.`
              : `Var fick ${plant.name} sitt nya hem?`}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="status-date">
              {isDeceased ? "Datum" : "Utflyttningsdatum"}
            </Label>
            <input
              id="status-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status-note">
              {isDeceased ? "Sista notering" : "Nytt hem"}{" "}
              <span className="font-normal text-muted-foreground">(valfritt)</span>
            </Label>
            <Textarea
              id="status-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isDeceased ? "" : "t.ex. till Anna"}
              rows={2}
              className="resize-none rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Sparar…" : isDeceased ? "Lägg till" : "Markera"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
