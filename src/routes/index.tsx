import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Leaf, LogOut, Droplets, ListChecks, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddPlantDialog } from "@/components/AddPlantDialog";
import { ChoreDialog } from "@/components/ChoreDialog";
import { InbjudanDialog } from "@/components/InbjudanDialog";
import { PlantProfileSheet } from "@/components/PlantProfileSheet";
import { listAllPlants, getAllLatestWatering, getAllLatestRepotting, Plant } from "@/lib/plants";
import { computeWaterChores, WaterChore } from "@/lib/chores";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

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
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeChore, setActiveChore] = useState<WaterChore | null>(null);
  const [inbjudanOpen, setInbjudanOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

  const setTab = (t: Tab) =>
    navigate({ search: (prev: IndexSearch) => ({ ...prev, tab: t }), replace: true });
  const setActiveTag = (t: string | null) =>
    navigate({ search: (prev: IndexSearch) => ({ ...prev, tag: t ?? undefined }), replace: true });

  const { session } = useSession();
  const { data: plants } = useQuery({ queryKey: ["plants"], queryFn: listAllPlants, staleTime: Infinity, enabled: !!session });
  const { data: wateringData } = useQuery({
    queryKey: ["watering"],
    queryFn: getAllLatestWatering,
    staleTime: Infinity,
    enabled: !!session,
  });
  const latestWateringDates = wateringData?.dates ?? new Map<string, string>();
  const latestWateringLabels = wateringData?.labels ?? new Map<string, string>();

  const { data: latestRepotting = new Map<string, string>() } = useQuery({
    queryKey: ["repotting"],
    queryFn: getAllLatestRepotting,
    staleTime: Infinity,
    enabled: !!session,
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["plants"] }),
      queryClient.invalidateQueries({ queryKey: ["watering"] }),
      queryClient.invalidateQueries({ queryKey: ["repotting"] }),
    ]);

  const chores = useMemo(
    () => (plants ? computeWaterChores(
      plants.filter((p) => p.status === "active"),
      latestWateringDates,
      new Date(),
      latestWateringLabels,
      latestRepotting,
    ) : []),
    [plants, latestWateringDates, latestWateringLabels, latestRepotting],
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    plants?.forEach((p) => p.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [plants]);

  const filteredPlants = useMemo(() => {
    if (!plants) return [];
    const q = search.trim().toLowerCase();
    const filtered = plants.filter((p) => {
      if (activeTag && !(p.tags ?? []).includes(activeTag)) return false;
      if (q) {
        const hay = `${p.name} ${p.species ?? ""} ${p.room ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Active plants first (DB order = created_at asc), then inactive sorted by most recently changed
    return filtered.sort((a, b) => {
      const aActive = a.status === "active";
      const bActive = b.status === "active";
      if (aActive !== bActive) return aActive ? -1 : 1;
      if (!aActive) {
        return (b.status_changed_at ?? "").localeCompare(a.status_changed_at ?? "");
      }
      return 0;
    });
  }, [plants, activeTag, search]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Min Växtdagbok</h1>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setInbjudanOpen(true)}
                aria-label="Inbjudningar"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <Mail className="h-4 w-4" />
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                aria-label="Logga ut"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
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
        {!plants ? (
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
                onPlantClick={(id) => setSelectedPlantId(id)}
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

      <AddPlantDialog open={open} onOpenChange={setOpen} onSaved={invalidate} />
      <InbjudanDialog open={inbjudanOpen} onOpenChange={setInbjudanOpen} />
      <ChoreDialog
        chore={activeChore}
        onOpenChange={(o) => !o && setActiveChore(null)}
        onDone={invalidate}
      />
      <PlantProfileSheet plantId={selectedPlantId} onClose={() => setSelectedPlantId(null)} />
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
  plants, total, tags, activeTag, onTag, search, onSearch, onAdd, onPlantClick,
}: {
  plants: Plant[]; total: number; tags: string[]; activeTag: string | null;
  onTag: (t: string | null) => void; search: string; onSearch: (s: string) => void;
  onAdd: () => void; onPlantClick: (id: string) => void;
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
            <button
              key={p.id}
              onClick={() => onPlantClick(p.id)}
              className="group block overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border transition active:scale-[0.98] text-left"
            >
              <div className="aspect-square overflow-hidden bg-secondary/60">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-cover transition group-hover:scale-105${p.status === "deceased" ? " [filter:sepia(0.85)_brightness(0.9)]" : ""}`}
                  />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center${p.status === "deceased" ? " opacity-50" : ""}`}>
                    <Leaf className="h-12 w-12 text-accent" />
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <div className="truncate text-sm font-medium">{p.name}</div>
                {(p.room || p.status !== "active") && (
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0 truncate text-xs text-muted-foreground">{p.room}</div>
                    {p.status !== "active" && (
                      <span className="shrink-0 text-[10px] italic text-muted-foreground/60">
                        {p.status === "deceased" ? "Minneslund" : "Utflyttad"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
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
