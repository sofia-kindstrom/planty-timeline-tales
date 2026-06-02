import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePicker } from "./ImagePicker";
import { supabase } from "@/integrations/supabase/client";
import { listPlants, Plant } from "@/lib/plants";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant;
  onSaved: () => void;
  onDeleted: () => void;
};

export function EditPlantDialog({ open, onOpenChange, plant, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(plant.name);
  const [species, setSpecies] = useState(plant.species ?? "");
  const [room, setRoom] = useState(plant.room ?? "");
  const [wateringDays, setWateringDays] = useState(plant.watering_interval_days?.toString() ?? "");
  const [lightNeeds, setLightNeeds] = useState(plant.light_needs ?? "");
  const [acquiredAt, setAcquiredAt] = useState(plant.acquired_at ?? "");
  const [notes, setNotes] = useState(plant.notes ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(plant.image_url);
  const [parentId, setParentId] = useState<string | null>(plant.parent_id);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) listPlants().then(setPlants).catch(() => {});
  }, [open]);

  // Exclude self and descendants to avoid cycles
  const parentOptions = useMemo(() => {
    const childrenOf = new Map<string, string[]>();
    for (const p of plants) {
      if (!p.parent_id) continue;
      const arr = childrenOf.get(p.parent_id) ?? [];
      arr.push(p.id);
      childrenOf.set(p.parent_id, arr);
    }
    const forbidden = new Set<string>([plant.id]);
    const stack = [plant.id];
    while (stack.length) {
      const id = stack.pop()!;
      for (const c of childrenOf.get(id) ?? []) {
        if (!forbidden.has(c)) { forbidden.add(c); stack.push(c); }
      }
    }
    return plants.filter((p) => !forbidden.has(p.id));
  }, [plants, plant.id]);

  const save = async () => {
    if (!name.trim()) { toast.error("Växten behöver ett namn"); return; }
    setSaving(true);
    const { error } = await supabase.from("plants").update({
      name: name.trim(),
      species: species.trim() || null,
      room: room.trim() || null,
      watering_interval_days: wateringDays ? parseInt(wateringDays, 10) : null,
      light_needs: lightNeeds.trim() || null,
      acquired_at: acquiredAt || null,
      notes: notes.trim() || null,
      image_url: imageUrl,
      parent_id: parentId,
    }).eq("id", plant.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sparat");
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    const { error } = await supabase.from("plants").delete().eq("id", plant.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Växten är borttagen");
    onOpenChange(false);
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redigera växt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <ImagePicker value={imageUrl} onChange={setImageUrl} />
          <div className="space-y-2">
            <Label htmlFor="name">Namn *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="species">Art</Label>
            <Input id="species" value={species} onChange={(e) => setSpecies(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Rum / placering</Label>
            <Input id="room" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="water">Vattnas (dagar)</Label>
              <Input id="water" type="number" inputMode="numeric" value={wateringDays}
                onChange={(e) => setWateringDays(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="light">Ljus</Label>
              <Input id="light" value={lightNeeds} onChange={(e) => setLightNeeds(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acq">Anskaffad</Label>
            <Input id="acq" type="date" value={acquiredAt} onChange={(e) => setAcquiredAt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive">Ta bort växt</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ta bort {plant.name}?</AlertDialogTitle>
                <AlertDialogDescription>Alla händelser för växten raderas också.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Ta bort</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Sparar…" : "Spara"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
