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

export async function uploadPlantImage(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Du måste vara inloggad för att ladda upp bilder.");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("plant-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
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
  return data as Plant[];
}

export async function getPlant(id: string): Promise<Plant> {
  const { data, error } = await supabase.from("plants").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Plant;
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
