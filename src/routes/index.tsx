import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Leaf, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddPlantDialog } from "@/components/AddPlantDialog";
import { listPlants, Plant } from "@/lib/plants";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Min Växtdagbok" },
      { name: "description", content: "Personlig dagbok för dina krukväxter." },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try { setPlants(await listPlants()); }
    catch { setPlants([]); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Leaf className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Min Växtdagbok</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            aria-label="Logga ut"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6">
        {plants === null && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-3xl bg-secondary/50" />
            ))}
          </div>
        )}

        {plants && plants.length === 0 && (
          <div className="mt-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <Leaf className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-medium">Inga växter än</h2>
            <p className="mt-1 text-sm text-muted-foreground">Lägg till din första krukväxt för att börja logga.</p>
            <Button className="mt-6" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Lägg till växt
            </Button>
          </div>
        )}

        {plants && plants.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {plants.map((p) => (
              <Link
                key={p.id}
                to="/plant/$id"
                params={{ id: p.id }}
                className="group block overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border transition active:scale-[0.98]"
              >
                <div className="aspect-square overflow-hidden bg-secondary/60">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
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
      </main>

      <button
        onClick={() => setOpen(true)}
        aria-label="Lägg till växt"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </button>

      <AddPlantDialog open={open} onOpenChange={setOpen} onSaved={load} />
    </div>
  );
}
