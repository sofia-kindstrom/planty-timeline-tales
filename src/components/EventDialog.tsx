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
import { EVENT_PRESETS } from "@/lib/event-icons";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantId: string;
  event?: PlantEvent | null;
  onSaved: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

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
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input id="date" type="date" value={eventAt} onChange={(e) => setEventAt(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Vad gjorde du?</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {EVENT_PRESETS.map((q) => {
                const active = label === q.label;
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setLabel(q.label)}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-xs transition active:scale-95 ${
                      active
                        ? "bg-primary/15 ring-2 ring-primary text-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    <span className="text-xl leading-none">{q.emoji}</span>
                    <span className="text-[11px] leading-tight">{q.label}</span>
                  </button>
                );
              })}
            </div>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Eller skriv egen…"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Anteckning</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              autoComplete="off"
              placeholder="Frivilligt — t.ex. ny kruka 17 cm, jorden var torr" />
          </div>
          <ImagePicker value={imageUrl} onChange={setImageUrl} aspect="video" label="Foto (valfritt)" />
        </form>
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
