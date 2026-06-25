import { supabase } from "@/integrations/supabase/client";

export type PlantStatus = 'active' | 'deceased' | 'rehomed';

export type Plant = {
  id: string;
  name: string;
  species: string | null;
  room: string | null;
  watering_interval_days: number | null;
  light_needs: string | null;
  acquired_at: string | null;
  notes: string | null;
  image_url: string | null;
  parent_id: string | null;
  tags: string[];
  water_snooze_until: string | null;
  status: PlantStatus;
  status_changed_at: string | null;
  status_note: string | null;
  created_at: string;
  updated_at: string;
};

export type PlantEvent = {
  id: string;
  plant_id: string;
  event_at: string;
  label: string;
  note: string | null;
  image_url: string | null;
  created_at: string;
};

/**
 * Komprimerar en bild i webbläsaren innan uppladdning.
 * - Max 1600px på längsta sidan
 * - JPEG kvalitet 0.85 (skarpt men ändå mycket mindre fil)
 * - Hoppar över komprimering för redan små filer (< 400 KB) och för GIF/SVG.
 */
async function compressImage(file: File): Promise<File> {
  if (file.size < 400 * 1024) return file;
  if (!/^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(file.type) && file.type !== "") {
    return file;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Bilden kunde inte läsas"));
    i.src = dataUrl;
  });

  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export async function uploadPlantImage(file: File): Promise<string> {
  const compressed = await compressImage(file).catch(() => file);
  const ext = (compressed.type === "image/jpeg" ? "jpg" : compressed.name.split(".").pop()) ?? "jpg";
  const path = `public/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("plant-images")
    .upload(path, compressed, { cacheControl: "3600", upsert: false, contentType: compressed.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from("plant-images").getPublicUrl(path);
  return data.publicUrl;
}

function normalizePlant(p: any): Plant {
  return { ...p, tags: p.tags ?? [], status: p.status ?? 'active' } as Plant;
}

export async function listPlants(): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizePlant);
}

export async function listAllPlants(): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizePlant);
}

export async function listDeceasedPlants(): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("status", "deceased")
    .order("status_changed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizePlant);
}

export async function listRehomePlants(): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("status", "rehomed")
    .order("status_changed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizePlant);
}

export async function updatePlantStatus(
  id: string,
  status: PlantStatus,
  statusChangedAt: string | null,
  statusNote: string | null,
  tags?: string[],
): Promise<void> {
  const patch: Record<string, unknown> = { status, status_changed_at: statusChangedAt, status_note: statusNote };
  if (tags !== undefined) patch.tags = tags;
  const { error } = await supabase.from("plants").update(patch).eq("id", id);
  if (error) throw error;
}

export async function getPlant(id: string): Promise<Plant> {
  const { data, error } = await supabase.from("plants").select("*").eq("id", id).single();
  if (error) throw error;
  return { ...(data as any), tags: (data as any).tags ?? [] } as Plant;
}

export async function listEvents(plantId: string): Promise<PlantEvent[]> {
  const { data, error } = await supabase
    .from("plant_events")
    .select("*")
    .eq("plant_id", plantId)
    .order("event_at", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as PlantEvent[];
}

/** Hämtar senaste vattningsdatumet per växt (för plantsysslor). */
export async function getLatestWateringByPlant(plantIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (plantIds.length === 0) return map;
  const { data, error } = await supabase
    .from("plant_events")
    .select("plant_id,event_at,label")
    .in("plant_id", plantIds)
    .in("label", ["Vattnad", "Vattnad m. näring"])
    .order("event_at", { ascending: false });
  if (error) throw error;
  for (const row of data ?? []) {
    if (!map.has((row as any).plant_id)) {
      map.set((row as any).plant_id, (row as any).event_at);
    }
  }
  return map;
}

/** Samma som ovan men utan plant-ID-filter — kan köras parallellt med listAllPlants. */
export async function getAllLatestWatering(): Promise<{ dates: Map<string, string>; labels: Map<string, string> }> {
  const dates = new Map<string, string>();
  const labels = new Map<string, string>();
  const { data, error } = await supabase
    .from("plant_events")
    .select("plant_id,event_at,label")
    .in("label", ["Vattnad", "Vattnad m. näring"])
    .order("event_at", { ascending: false });
  if (error) throw error;
  for (const row of data ?? []) {
    const r = row as any;
    if (!dates.has(r.plant_id)) {
      dates.set(r.plant_id, r.event_at);
      labels.set(r.plant_id, r.label);
    }
  }
  return { dates, labels };
}

/** Senaste omplanterings-datum per växt (för näringsspärr 6 veckor). */
export async function getAllLatestRepotting(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data, error } = await supabase
    .from("plant_events")
    .select("plant_id,event_at")
    .eq("label", "Omplanterad")
    .order("event_at", { ascending: false });
  if (error) throw error;
  for (const row of data ?? []) {
    const r = row as any;
    if (!map.has(r.plant_id)) map.set(r.plant_id, r.event_at);
  }
  return map;
}
