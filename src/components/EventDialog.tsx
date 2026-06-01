import { useEffect, useState } from "react";
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
import { PlantEvent } from "@/lib/plants";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantId: string;
  event?: PlantEvent | null;
  onSaved: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

const QUICK_LABELS = ["Vattnad", "Vattnad m. näring", "Beskuren", "Omplanterad", "Roterad", "Annat"];

export function EventDialog({ open, onOpenChange, plantId, event, onSaved }: Props) {
  const editing = !!event;
  const [eventAt, setEventAt] = useState(today());
  const [label, setLabel] = useState("Vattnad");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEventAt(event?.event_at ?? today());
      setLabel(event?.label ?? "Vattnad");
      setNote(event?.note ?? "");
      setImageUrl(event?.image_url ?? null);
    }
  }, [open, event]);

  const save = async () => {
    if (!label.trim()) { toast.error("Skriv vad du gjorde"); return; }
    setSaving(true);
    const payload = {
      plant_id: plantId,
      event_at: eventAt,
      label: label.trim(),
      note: note.trim() || null,
      image_url: imageUrl,
    };
    const { error } = editing
      ? await supabase.from("plant_events").update(payload).eq("id", event!.id)
      : await supabase.from("plant_events").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Uppdaterad" : "Tillagd 🌿");
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!event) return;
    const { error } = await supabase.from("plant_events").delete().eq("id", event.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Borttagen");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Redigera händelse" : "Ny händelse"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input id="date" type="date" value={eventAt} onChange={(e) => setEventAt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Vad gjorde du?</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Vattnad" />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_LABELS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setLabel(q)}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-accent"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Anteckning</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="Frivilligt — t.ex. ny kruka 17 cm, jorden var torr" />
          </div>
          <ImagePicker value={imageUrl} onChange={setImageUrl} aspect="video" label="Foto (valfritt)" />
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {editing ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ta bort händelse?</AlertDialogTitle>
                  <AlertDialogDescription>Detta går inte att ångra.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={remove}>Ta bort</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Sparar…" : "Spara"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
