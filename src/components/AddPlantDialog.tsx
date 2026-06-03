import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  onSaved: () => void;
  defaultParentId?: string | null;
};

export function AddPlantDialog({ open, onOpenChange, onSaved, defaultParentId = null }: Props) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [room, setRoom] = useState("");
  const [wateringDays, setWateringDays] = useState("");
  const [lightNeeds, setLightNeeds] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setParentId(defaultParentId);
      listPlants().then(setPlants).catch(() => {});
    }
  }, [open, defaultParentId]);

  const reset = () => {
    setName(""); setSpecies(""); setRoom(""); setWateringDays("");
    setLightNeeds(""); setAcquiredAt(""); setNotes(""); setImageUrl(null);
    setParentId(defaultParentId);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Växten behöver ett namn");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); toast.error("Du måste vara inloggad."); return; }
    const { error } = await supabase.from("plants").insert({
      user_id: user.id,
      name: name.trim(),
      species: species.trim() || null,
      room: room.trim() || null,
      watering_interval_days: wateringDays ? parseInt(wateringDays, 10) : null,
      light_needs: lightNeeds.trim() || null,
      acquired_at: acquiredAt || null,
      notes: notes.trim() || null,
      image_url: imageUrl,
      parent_id: parentId,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Växten är tillagd 🌱");
    reset();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ny växt</DialogTitle>
        </DialogHeader>
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {/* dummy fält som lurar Safari/Chrome autofill att inte fylla i de riktiga */}
          <input type="text" name="prevent_autofill" autoComplete="off" className="hidden" tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" autoComplete="new-password" className="hidden" tabIndex={-1} />
          <ImagePicker value={imageUrl} onChange={setImageUrl} />
          <div className="space-y-2">
            <Label htmlFor="name">Namn *</Label>
            <Input id="name" name="plant-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} placeholder="Monstera Lisa" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="species">Art</Label>
            <Input id="species" name="plant-species" autoComplete="off" value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Monstera deliciosa" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Rum / placering</Label>
            <Input id="room" name="plant-room" autoComplete="off" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Vardagsrum, söderfönster" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="water">Vattnas (dagar)</Label>
              <Input id="water" type="number" inputMode="numeric" autoComplete="off" value={wateringDays}
                onChange={(e) => setWateringDays(e.target.value)} placeholder="7" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="light">Ljus</Label>
              <Input id="light" name="plant-light" autoComplete="off" value={lightNeeds} onChange={(e) => setLightNeeds(e.target.value)} placeholder="Indirekt" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acq">Anskaffad</Label>
            <Input id="acq" type="date" autoComplete="off" value={acquiredAt} onChange={(e) => setAcquiredAt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent">Mor-växt (om sticklingen kommer från en annan växt)</Label>
            <select
              id="parent"
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Ingen —</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea id="notes" name="plant-notes" autoComplete="off" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Sparar…" : "Spara växt"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
