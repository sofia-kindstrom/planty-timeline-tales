import { supabase } from "@/integrations/supabase/client";

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

export async function listPlants(): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({ ...p, tags: p.tags ?? [] })) as Plant[];
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
