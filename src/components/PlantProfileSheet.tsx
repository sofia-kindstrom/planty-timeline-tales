import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Droplets, GitBranch, Home, Leaf, Pencil, Plus, Sun, Tag } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  getPlant,
  listAllPlants,
  listEvents,
  updatePlantStatus,
  Plant,
  PlantEvent,
  PlantStatus,
} from "@/lib/plants";
import { AddPlantDialog } from "@/components/AddPlantDialog";
import { EditPlantDialog } from "@/components/EditPlantDialog";
import { EventDialog } from "@/components/EventDialog";
import { PlantStatusDialog } from "@/components/PlantStatusDialog";
import { emojiForLabel } from "@/lib/event-icons";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

export function PlantProfileSheet({
  plantId,
  onClose,
}: {
  plantId: string | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={!!plantId} onOpenChange={(open) => !open && onClose()} shouldScaleBackground={false}>
      <DrawerContent className="h-[95dvh] rounded-t-[28px] p-0 flex flex-col overflow-hidden border-0 outline-none">
        {plantId && <PlantProfileInner plantId={plantId} onClose={onClose} />}
      </DrawerContent>
    </Drawer>
  );
}

function PlantProfileInner({ plantId, onClose }: { plantId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addCuttingOpen, setAddCuttingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlantEvent | null>(null);
  const [statusDialogTarget, setStatusDialogTarget] = useState<Extract<PlantStatus, "deceased" | "rehomed"> | null>(null);

  const { data: plant } = useQuery({
    queryKey: ["plant", plantId],
    queryFn: () => getPlant(plantId),
    staleTime: Infinity,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events", plantId],
    queryFn: () => listEvents(plantId),
    enabled: !!plant,
    staleTime: Infinity,
  });

  const { data: allPlants = [] } = useQuery({
    queryKey: ["plants"],
    queryFn: listAllPlants,
    staleTime: Infinity,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["plant", plantId] });
    queryClient.invalidateQueries({ queryKey: ["events", plantId] });
    queryClient.invalidateQueries({ queryKey: ["plants"] });
    queryClient.invalidateQueries({ queryKey: ["watering"] });
  };

  if (!plant) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">Laddar…</div>
    );
  }

  return (
    <>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Hero */}
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-secondary">
          {plant.image_url ? (
            <img
              src={plant.image_url}
              alt={plant.name}
              fetchPriority="high"
              className={`h-full w-full object-cover${plant.status === "deceased" ? " [filter:sepia(0.85)_brightness(0.9)]" : ""}`}
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center${plant.status === "deceased" ? " opacity-50" : ""}`}>
              <Leaf className="h-20 w-20 text-accent" />
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background/85 shadow backdrop-blur"
              aria-label="Stäng"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background/85 shadow backdrop-blur"
              aria-label="Redigera"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>

        <main className="mx-auto max-w-3xl px-4">
          {plant.status !== "active" && (
            <StatusBanner
              status={plant.status as "deceased" | "rehomed"}
              date={plant.status_changed_at}
              note={plant.status_note}
              onReactivate={async () => {
                const newTags = (plant.tags ?? []).filter((t) => t !== "minneslund" && t !== "utflyttad");
                await updatePlantStatus(plant.id, "active", null, null, newTags);
                refresh();
              }}
            />
          )}

          <div className="mt-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
            <h1 className="text-2xl font-semibold tracking-tight">{plant.name}</h1>
            {plant.species && <p className="mt-1 text-sm italic text-muted-foreground">{plant.species}</p>}

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {plant.room && <Info icon={<Home className="h-4 w-4" />} label="Plats" value={plant.room} />}
              {plant.light_needs && <Info icon={<Sun className="h-4 w-4" />} label="Ljus" value={plant.light_needs} />}
              {plant.watering_interval_days != null && (
                <Info icon={<Droplets className="h-4 w-4" />} label="Vattnas" value={`var ${plant.watering_interval_days}:e dag`} />
              )}
              {plant.acquired_at && (
                <Info icon={<Calendar className="h-4 w-4" />} label="Sedan" value={formatDate(plant.acquired_at)} />
              )}
            </div>

            {plant.tags && plant.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                {plant.tags.map((t) => (
                  <Link
                    key={t}
                    to="/"
                    search={{ tab: "gallery", tag: t }}
                    onClick={onClose}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground transition active:scale-95"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}

            {plant.notes && (
              <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-secondary/50 p-3 text-sm">{plant.notes}</p>
            )}
          </div>

          <FamilyTree current={plant} all={allPlants} onAddCutting={() => setAddCuttingOpen(true)} />
          <Timeline events={events} onEdit={setEditingEvent} />

          {plant.status === "active" && (
            <section className="mt-8 mb-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusDialogTarget("deceased")}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary/80 active:scale-95"
                >
                  Lägg till i Minneslund
                </button>
                <button
                  onClick={() => setStatusDialogTarget("rehomed")}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary/80 active:scale-95"
                >
                  Markera som utflyttad
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* FAB — floats at bottom-right of sheet */}
      {plant.status === "active" && (
        <button
          onClick={() => setAddOpen(true)}
          aria-label="Lägg till händelse"
          className="absolute bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      <EventDialog open={addOpen} onOpenChange={setAddOpen} plantId={plant.id} onSaved={refresh} />
      <EventDialog
        open={!!editingEvent}
        onOpenChange={(o) => !o && setEditingEvent(null)}
        plantId={plant.id}
        event={editingEvent}
        onSaved={refresh}
      />
      <EditPlantDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        plant={plant}
        onSaved={refresh}
        onDeleted={onClose}
      />
      <AddPlantDialog
        open={addCuttingOpen}
        onOpenChange={setAddCuttingOpen}
        onSaved={refresh}
        defaultParentId={plant.id}
      />
      {statusDialogTarget && (
        <PlantStatusDialog
          open={!!statusDialogTarget}
          onOpenChange={(o) => !o && setStatusDialogTarget(null)}
          plant={plant}
          targetStatus={statusDialogTarget}
          onSaved={() => { setStatusDialogTarget(null); refresh(); }}
        />
      )}
    </>
  );
}

function StatusBanner({
  status, date, note, onReactivate,
}: {
  status: "deceased" | "rehomed"; date: string | null; note: string | null; onReactivate: () => void;
}) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const isDeceased = status === "deceased";
  return (
    <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${isDeceased ? "bg-stone-100 text-stone-700 dark:bg-stone-800/40 dark:text-stone-300" : "bg-secondary text-secondary-foreground"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-medium">{isDeceased ? "Vila i frid" : "Utflyttad"}</span>
          {formattedDate && <span className="text-muted-foreground"> · {formattedDate}</span>}
          {note && <div className="mt-0.5 text-xs text-muted-foreground">{isDeceased ? note : `till ${note}`}</div>}
        </div>
        <button
          onClick={onReactivate}
          className="shrink-0 rounded-full bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-background active:scale-95"
        >
          Återaktivera
        </button>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-secondary/40 p-2.5">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-sm">{value}</div>
      </div>
    </div>
  );
}

function FamilyTree({
  current, all, onAddCutting,
}: {
  current: Plant; all: Plant[]; onAddCutting: () => void;
}) {
  const { root, byParent } = useMemo(() => {
    const byId = new Map(all.map((p) => [p.id, p]));
    const byParent = new Map<string | null, Plant[]>();
    for (const p of all) {
      const key = p.parent_id ?? null;
      const arr = byParent.get(key) ?? [];
      arr.push(p);
      byParent.set(key, arr);
    }
    let root: Plant = current;
    const seen = new Set<string>([current.id]);
    while (root.parent_id) {
      const next = byId.get(root.parent_id);
      if (!next || seen.has(next.id)) break;
      seen.add(next.id);
      root = next;
    }
    return { root, byParent };
  }, [all, current]);

  const hasFamily = root.id !== current.id || (byParent.get(current.id)?.length ?? 0) > 0;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <GitBranch className="h-4 w-4 text-primary" /> Släktträd
        </h2>
        {current.status === "active" && (
          <button
            onClick={onAddCutting}
            className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition active:scale-95"
          >
            + Stickling
          </button>
        )}
      </div>
      {!hasFamily ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
          Ingen släkt än. Lägg till en stickling så börjar trädet växa 🌿
        </div>
      ) : (
        <div className="no-scrollbar mt-4 -mx-4 overflow-x-auto px-4 pb-2 pt-2">
          <div className="inline-block min-w-full pt-1">
            <TreeNode node={root} byParent={byParent} currentId={current.id} />
          </div>
        </div>
      )}
    </section>
  );
}

function TreeNode({
  node, byParent, currentId,
}: {
  node: Plant; byParent: Map<string | null, Plant[]>; currentId: string;
}) {
  const children = byParent.get(node.id) ?? [];
  const isCurrent = node.id === currentId;
  return (
    <div className="flex flex-col items-start">
      <Link
        to="/plant/$id"
        params={{ id: node.id }}
        className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 ring-1 transition active:scale-95 ${
          isCurrent ? "bg-primary/15 ring-primary" : "bg-card ring-border hover:bg-secondary"
        }`}
      >
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-secondary">
          {node.image_url ? (
            <img src={node.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Leaf className="h-4 w-4 text-accent" />
            </div>
          )}
        </div>
        <span className={`text-sm ${isCurrent ? "font-semibold" : ""}`}>{node.name}</span>
      </Link>
      {children.length > 0 && (
        <div className="ml-4 mt-2 border-l-2 border-border pl-4">
          <div className="flex flex-col gap-2">
            {children.map((c) => (
              <TreeNode key={c.id} node={c} byParent={byParent} currentId={currentId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

function Timeline({ events, onEdit }: { events: PlantEvent[]; onEdit: (e: PlantEvent) => void }) {
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => (showAll ? events : events.slice(-PAGE_SIZE)),
    [events, showAll],
  );
  const hiddenCount = events.length - visible.length;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [visible.length]);

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-lg font-semibold">Tidslinje</h2>
        <span className="text-xs text-muted-foreground">
          {events.length} händelser{events.length > 0 ? " • senaste till höger" : ""}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
          Inga händelser än. Tryck på + för att logga första gången du vattnar 💧
        </div>
      ) : (
        <>
          {hiddenCount > 0 && (
            <div className="mt-3 px-1">
              <button
                onClick={() => setShowAll(true)}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition active:scale-95"
              >
                Visa {hiddenCount} äldre
              </button>
            </div>
          )}
          <div ref={scrollRef} className="no-scrollbar mt-4 -mx-4 overflow-x-auto px-4 pb-4 pt-2">
            <div className="inline-flex min-w-full items-stretch gap-4">
              {visible.map((e) => {
                const emoji = emojiForLabel(e.label);
                return (
                  <button
                    key={e.id}
                    onClick={() => onEdit(e)}
                    className="group flex w-56 shrink-0 flex-col text-left"
                  >
                    <div className="mb-2 flex flex-col items-center">
                      <div className="text-xs text-muted-foreground">{formatDate(e.event_at)}</div>
                      <div className="mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary shadow" />
                    </div>
                    <div className="flex-1 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border transition group-active:scale-[0.98]">
                      {e.image_url ? (
                        <div className="mb-2 aspect-video w-full overflow-hidden rounded-xl bg-secondary">
                          <img src={e.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="mb-2 flex aspect-video w-full items-center justify-center rounded-xl bg-secondary/60">
                          {emoji ? (
                            <span className="text-4xl leading-none">{emoji}</span>
                          ) : (
                            <Leaf className="h-8 w-8 text-accent" />
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-sm font-medium leading-snug">
                        {emoji && e.image_url && <span>{emoji}</span>}
                        <span>{e.label}</span>
                      </div>
                      {e.note && <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{e.note}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
