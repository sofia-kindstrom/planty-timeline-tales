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
import { addReminder, deleteReminder, completeReminder, updateReminder, PlantReminder } from "@/lib/reminders";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantId: string;
  reminder?: PlantReminder | null;
  onSaved: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export function ReminderDialog({ open, onOpenChange, plantId, reminder, onSaved }: Props) {
  const editing = !!reminder;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [remindAt, setRemindAt] = useState(today());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(reminder?.title ?? "");
      setBody(reminder?.body ?? "");
      setRemindAt(reminder?.remind_at ?? today());
    }
  }, [open, reminder]);

  const save = async () => {
    if (!title.trim()) { toast.error("Skriv en rubrik"); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateReminder(reminder!.id, { title: title.trim(), body: body.trim() || null, remind_at: remindAt });
      } else {
        await addReminder({ plant_id: plantId, title: title.trim(), body: body.trim() || null, remind_at: remindAt });
      }
      toast.success(editing ? "Uppdaterad" : "Påminnelse tillagd 🔔");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Något gick fel");
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    if (!reminder) return;
    setSaving(true);
    try {
      await completeReminder(reminder);
      toast.success("Klar ✓ — tillagd på tidslinjen");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Något gick fel");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!reminder) return;
    try {
      await deleteReminder(reminder.id);
      toast.success("Borttagen");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Något gick fel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Redigera påminnelse" : "Ny påminnelse"}</DialogTitle>
        </DialogHeader>
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-title">Rubrik</Label>
            <Input
              id="reminder-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Kolla efter spinnkvalster"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminder-body">Text</Label>
            <Textarea
              id="reminder-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              autoComplete="off"
              placeholder="Frivilligt — mer detaljer om vad som ska göras"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminder-date">Datum</Label>
            <Input id="reminder-date" type="date" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} autoComplete="off" />
          </div>
        </form>
        {editing && (
          <Button variant="secondary" onClick={complete} disabled={saving} className="w-full">
            <Check className="mr-1 h-4 w-4" /> Markera klar
          </Button>
        )}
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
                  <AlertDialogTitle>Ta bort påminnelse?</AlertDialogTitle>
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
