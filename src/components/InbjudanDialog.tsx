import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Trash2 } from "lucide-react";
import {
  listInbjudningar,
  createInbjudan,
  deleteInbjudan,
  GuestTokenRecord,
} from "@/lib/guest";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

function defaultExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function InbjudanDialog({ open, onOpenChange }: Props) {
  const [invites, setInvites] = useState<GuestTokenRecord[]>([]);
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState(defaultExpiry());
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = () => {
    listInbjudningar().then(setInvites).catch(() => {});
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createInbjudan(label.trim() || null, `${expiresAt}T23:59:59Z`);
      toast.success("Inbjudan skapad!");
      setLabel("");
      setExpiresAt(defaultExpiry());
      load();
    } catch (err: any) {
      console.error("Skapa inbjudan misslyckades:", err);
      toast.error(err?.message ?? "Kunde inte skapa inbjudan.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (record: GuestTokenRecord) => {
    const link = `${window.location.origin}/vatten?token=${record.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInbjudan(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("Kunde inte ta bort inbjudan.");
    }
  };

  const now = new Date();
  const active = invites.filter((i) => new Date(i.expires_at) > now);
  const expired = invites.filter((i) => new Date(i.expires_at) <= now);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inbjudningar</DialogTitle>
        </DialogHeader>

        {/* Create form */}
        <div className="space-y-3 rounded-2xl bg-secondary/40 p-4">
          <p className="text-sm font-medium">Ny inbjudan</p>
          <div className="space-y-1.5">
            <Label htmlFor="invite-label">
              Beskrivning{" "}
              <span className="font-normal text-muted-foreground">(valfritt)</span>
            </Label>
            <Input
              id="invite-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="t.ex. Anna semestervecka"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-expiry">Giltig till</Label>
            <input
              id="invite-expiry"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? "Skapar…" : "Skapa inbjudan"}
          </Button>
        </div>

        {/* Active invites */}
        {active.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aktiva
            </p>
            {active.map((inv) => (
              <InviteRow
                key={inv.id}
                invite={inv}
                expired={false}
                copied={copiedId === inv.id}
                onCopy={() => handleCopy(inv)}
                onDelete={() => handleDelete(inv.id)}
              />
            ))}
          </div>
        )}

        {/* Expired invites */}
        {expired.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Utgångna
            </p>
            {expired.map((inv) => (
              <InviteRow
                key={inv.id}
                invite={inv}
                expired={true}
                copied={copiedId === inv.id}
                onCopy={() => handleCopy(inv)}
                onDelete={() => handleDelete(inv.id)}
              />
            ))}
          </div>
        )}

        {invites.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Inga inbjudningar än.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteRow({
  invite,
  expired,
  copied,
  onCopy,
  onDelete,
}: {
  invite: GuestTokenRecord;
  expired: boolean;
  copied: boolean;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const dateStr = new Date(invite.expires_at).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`flex items-center gap-2 rounded-xl p-3 ring-1 ring-border ${
        expired ? "opacity-60" : "bg-card"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {invite.label ?? "Inbjudan"}
        </div>
        <div className="text-xs text-muted-foreground">
          {expired ? "Utgick" : "Giltig till"} {dateStr}
        </div>
      </div>
      <button
        onClick={onCopy}
        aria-label="Kopiera länk"
        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-secondary"
      >
        {copied ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <button
        onClick={onDelete}
        aria-label="Ta bort"
        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
