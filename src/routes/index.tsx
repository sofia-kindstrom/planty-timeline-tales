import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Leaf, Droplets, ListChecks, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddPlantDialog } from "@/components/AddPlantDialog";
import { ChoreDialog } from "@/components/ChoreDialog";
import { listPlants, getLatestWateringByPlant, Plant } from "@/lib/plants";
import { computeWaterChores, WaterChore } from "@/lib/chores";

type Tab = "chores" | "gallery";

type IndexSearch = {
  tab: Tab;
  tag?: string;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Min Växtdagbok" },
      { name: "description", content: "Personlig dagbok för dina krukväxter." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): IndexSearch => {
    const t = search.tab === "gallery" ? "gallery" : "chores";
    const tag = typeof search.tag === "string" && search.tag.length > 0 ? search.tag : undefined;
    return { tab: t, tag };
  },
  component: Home,
});

function Home() {
  const { tab, tag: activeTag } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [latestWatering, setLatestWatering] = useState<Map<string, string>>(new Map());
  const [open, setOpen] = useState(false);
  const [activeChore, setActiveChore] = useState<WaterChore | null>(null);
  const [search, setSearch] = useState("");

  const setTab = (t: Tab) =>
    navigate({ search: (prev: IndexSearch) => ({ ...prev, tab: t }), replace: true });
  const setActiveTag = (t: string | null) =>
    navigate({ search: (prev: IndexSearch) => ({ ...prev, tag: t ?? undefined }), replace: true });

  const load = async () => {
    try {
      const list = await listPlants();
      const latest = await getLatestWateringByPlant(list.map((p) => p.id));
      // Sätt båda samtidigt för att undvika att alla växter blinkar förbi som plantsysslor
      setLatestWatering(latest);
      setPlants(list);
    } catch {
      setPlants([]);
    }
  };
  useEffect(() => { load(); }, []);

  const chores = useMemo(
    () => (plants ? computeWaterChores(plants, latestWatering) : []),
    [plants, latestWatering],
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    plants?.forEach((p) => p.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [plants]);

  const filteredPlants = useMemo(() => {
    if (!plants) return [];
    const q = search.trim().toLowerCase();
    return plants.filter((p) => {
      if (activeTag && !(p.tags ?? []).includes(activeTag)) return false;
      if (q) {
        const hay = `${p.name} ${p.species ?? ""} ${p.room ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [plants, activeTag, search]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Min Växtdagbok</h1>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            <TabBtn active={tab === "chores"} onClick={() => setTab("chores")}>
              <ListChecks className="h-4 w-4" /> Plantsysslor
              {chores.length > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {chores.length}
                </span>
              )}
            </TabBtn>
            <TabBtn active={tab === "gallery"} onClick={() => setTab("gallery")}>
              <Leaf className="h-4 w-4" /> Galleri
            </TabBtn>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6">
        {plants === null ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-3xl bg-secondary/50" />
            ))}
          </div>
        ) : (
          <>
            <div className={tab === "chores" ? "" : "hidden"}>
              <ChoresView chores={chores} onSelect={setActiveChore} hasPlants={plants.length > 0} />
            </div>
            <div className={tab === "gallery" ? "" : "hidden"}>
              <GalleryView
                plants={filteredPlants}
                total={plants.length}
                tags={allTags}
                activeTag={activeTag ?? null}
                onTag={setActiveTag}
                search={search}
                onSearch={setSearch}
                onAdd={() => setOpen(true)}
              />
            </div>
          </>
        )}
      </main>

      <button
        onClick={() => setOpen(true)}
        aria-label="Lägg till växt"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </button>

      <AddPlantDialog open={open} onOpenChange={setOpen} onSaved={load} />
      <ChoreDialog
        chore={activeChore}
        onOpenChange={(o) => !o && setActiveChore(null)}
        onDone={load}
      />
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ChoresView({ chores, onSelect, hasPlants }: { chores: WaterChore[]; onSelect: (c: WaterChore) => void; hasPlants: boolean }) {
  if (chores.length === 0) {
    return (
      <div className="mt-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <Check className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-medium">Allt klart!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasPlants ? "Inga växter behöver vatten just nu 🌿" : "Lägg till växter för att se sysslor här."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {chores.map((c) => (
        <li key={c.plant.id}>
          <button
            onClick={() => onSelect(c)}
            className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-sm ring-1 ring-border transition active:scale-[0.99]"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
              {c.plant.image_url ? (
                <img src={c.plant.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><Leaf className="h-6 w-6 text-accent" /></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{c.plant.name}</div>
              {c.plant.room && <div className="truncate text-xs text-muted-foreground">{c.plant.room}</div>}
            </div>
            <div className="flex flex-col items-end">
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                c.daysOverdue >= 2 ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
              }`}>
                <Droplets className="h-3.5 w-3.5" />
                {c.daysOverdue === 0 ? "Dags idag" : c.daysOverdue === 1 ? "1 dag försenad" : `${c.daysOverdue} dagar försenad`}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function GalleryView({
  plants, total, tags, activeTag, onTag, search, onSearch, onAdd,
}: {
  plants: Plant[]; total: number; tags: string[]; activeTag: string | null;
  onTag: (t: string | null) => void; search: string; onSearch: (s: string) => void; onAdd: () => void;
}) {
  if (total === 0) {
    return (
      <div className="mt-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <Leaf className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-medium">Inga växter än</h2>
        <p className="mt-1 text-sm text-muted-foreground">Lägg till din första krukväxt för att börja logga.</p>
        <Button className="mt-6" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" /> Lägg till växt
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Sök växt, art, rum eller tagg…"
          className="w-full rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {tags.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <TagChip active={activeTag === null} onClick={() => onTag(null)}>Alla</TagChip>
            {tags.map((t) => (
              <TagChip key={t} active={activeTag === t} onClick={() => onTag(activeTag === t ? null : t)}>
                {t}
              </TagChip>
            ))}
          </div>
        )}
      </div>

      {plants.length === 0 ? (
        <div className="mt-12 text-center text-sm text-muted-foreground">Ingen växt matchar filtret.</div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {plants.map((p) => (
            <Link
              key={p.id}
              to="/plant/$id"
              params={{ id: p.id }}
              className="group block overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border transition active:scale-[0.98]"
            >
              <div className="aspect-square overflow-hidden bg-secondary/60">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Leaf className="h-12 w-12 text-accent" />
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <div className="truncate text-sm font-medium">{p.name}</div>
                {p.room && <div className="truncate text-xs text-muted-foreground">{p.room}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function TagChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </button>
  );
}
