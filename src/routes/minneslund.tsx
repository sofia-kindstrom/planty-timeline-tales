import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Leaf } from "lucide-react";
import { listDeceasedPlants, Plant } from "@/lib/plants";

export const Route = createFileRoute("/minneslund")({
  head: () => ({
    meta: [{ title: "Minneslund – Min Växtdagbok" }],
  }),
  component: MinneslundPage,
});

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("sv-SE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function MinneslundPage() {
  const [plants, setPlants] = useState<Plant[] | null>(null);

  useEffect(() => {
    listDeceasedPlants()
      .then(setPlants)
      .catch(() => setPlants([]));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              search={{ tab: "gallery" }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition"
              aria-label="Tillbaka"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-semibold tracking-tight">Minneslund</h1>
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
        ) : plants.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <Leaf className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-medium">Minneslunden är tom</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lyckligtvis. Inga växter har lagts till här.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-muted-foreground">
              {plants.length === 1 ? "1 växt" : `${plants.length} växter`} vilar här.
            </p>
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
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover [filter:sepia(0.85)_brightness(0.9)] transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center opacity-60">
                        <Leaf className="h-12 w-12 text-accent" />
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    {p.status_changed_at && (
                      <div className="truncate text-xs text-muted-foreground">
                        Vila i frid · {formatDate(p.status_changed_at)}
                      </div>
                    )}
                    {p.status_note && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground/70 italic">
                        {p.status_note}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
