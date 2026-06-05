import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Pencil, Droplets, Sun, Calendar, Home, Leaf, GitBranch, Tag } from "lucide-react";
import { getPlant, listEvents, listPlants, Plant, PlantEvent } from "@/lib/plants";
import { EventDialog } from "@/components/EventDialog";
import { EditPlantDialog } from "@/components/EditPlantDialog";
import { AddPlantDialog } from "@/components/AddPlantDialog";
import { emojiForLabel } from "@/lib/event-icons";

export const Route = createFileRoute("/plant/$id")({
  component: PlantPage,
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("sv-SE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function PlantPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [events, setEvents] = useState<PlantEvent[]>([]);
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addCuttingOpen, setAddCuttingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlantEvent | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, e, all] = await Promise.all([getPlant(id), listEvents(id), listPlants()]);
      setPlant(p); setEvents(e); setAllPlants(all);
    } catch {
      setPlant(null);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Laddar…</div>;
  }
  if (!plant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p>Hittade ingen växt.</p>
        <Link to="/" className="text-primary underline">Tillbaka</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        {plant.image_url ? (
          <img src={plant.image_url} alt={plant.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Leaf className="h-20 w-20 text-accent" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background/85 backdrop-blur shadow"
            aria-label="Tillbaka"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background/85 backdrop-blur shadow"
            aria-label="Redigera"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4">
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

          {plant.notes && (
            <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-secondary/50 p-3 text-sm">{plant.notes}</p>
          )}
        </div>

        {/* Family tree */}
        <FamilyTree current={plant} all={allPlants} onAddCutting={() => setAddCuttingOpen(true)} />

        {/* Timeline */}
        <Timeline events={events} onEdit={setEditingEvent} />
      </main>

      <button
        onClick={() => setAddOpen(true)}
        aria-label="Lägg till händelse"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </button>

      <EventDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        plantId={plant.id}
        onSaved={load}
      />
      <EventDialog
        open={!!editingEvent}
        onOpenChange={(o) => !o && setEditingEvent(null)}
        plantId={plant.id}
        event={editingEvent}
        onSaved={load}
      />
      <EditPlantDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        plant={plant}
        onSaved={load}
        onDeleted={() => navigate({ to: "/" })}
      />
      <AddPlantDialog
        open={addCuttingOpen}
        onOpenChange={setAddCuttingOpen}
        onSaved={load}
        defaultParentId={plant.id}
      />
    </div>
  );
}

function FamilyTree({
  current,
  all,
  onAddCutting,
}: {
  current: Plant;
  all: Plant[];
  onAddCutting: () => void;
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
        <button
          onClick={onAddCutting}
          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition active:scale-95"
        >
          + Stickling
        </button>
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
  node,
  byParent,
  currentId,
}: {
  node: Plant;
  byParent: Map<string | null, Plant[]>;
  currentId: string;
}) {
  const children = byParent.get(node.id) ?? [];
  const isCurrent = node.id === currentId;
  return (
    <div className="flex flex-col items-start">
      <Link
        to="/plant/$id"
        params={{ id: node.id }}
        className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 ring-1 transition active:scale-95 ${
          isCurrent
            ? "bg-primary/15 ring-primary"
            : "bg-card ring-border hover:bg-secondary"
        }`}
      >
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-secondary">
          {node.image_url ? (
            <img src={node.image_url} alt="" className="h-full w-full object-cover" />
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

const PAGE_SIZE = 10;

function Timeline({
  events,
  onEdit,
}: {
  events: PlantEvent[];
  onEdit: (e: PlantEvent) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // events are sorted ascending → senaste sist. Visa de 10 senaste.
  const visible = useMemo(
    () => (showAll ? events : events.slice(-PAGE_SIZE)),
    [events, showAll],
  );
  const hiddenCount = events.length - visible.length;

  // Auto-scrolla längst till höger när listan ändras
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
                    {/* Datum + prick ovanför kortet → ingen krock med långa anteckningar */}
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
