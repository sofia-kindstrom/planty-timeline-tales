import { supabase } from "@/integrations/supabase/client";
import type { Plant } from "./plants";

export type GuestTokenRecord = {
  id: string;
  token: string;
  owner_user_id: string;
  label: string | null;
  expires_at: string;
  created_at: string;
};

export async function validateGuestToken(token: string): Promise<{
  valid: boolean;
  reason: "ok" | "expired" | "not_found";
  label: string | null;
}> {
  const { data, error } = await (supabase as any).rpc("validate_guest_token", { p_token: token });
  if (error) throw error;
  return data as { valid: boolean; reason: "ok" | "expired" | "not_found"; label: string | null };
}

export async function getGuestPlants(token: string): Promise<Plant[]> {
  const { data, error } = await (supabase as any).rpc("get_plants_for_guest", { p_token: token });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({ ...p, tags: p.tags ?? [], status: p.status ?? "active" }));
}

export async function getGuestWatering(token: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data, error } = await (supabase as any).rpc("get_watering_for_guest", { p_token: token });
  if (error) throw error;
  for (const row of data ?? []) {
    map.set(row.plant_id, row.event_at);
  }
  return map;
}

export async function waterPlantAsGuest(
  token: string,
  plantId: string,
  label: string,
  note?: string,
): Promise<void> {
  const { data, error } = await (supabase as any).rpc("water_plant_for_guest", {
    p_token: token,
    p_plant_id: plantId,
    p_label: label,
    p_note: note ?? null,
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
}

export async function listInbjudningar(): Promise<GuestTokenRecord[]> {
  const { data, error } = await supabase
    .from("guest_tokens")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GuestTokenRecord[];
}

export async function createInbjudan(
  label: string | null,
  expiresAt: string,
): Promise<GuestTokenRecord> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("guest_tokens")
    .insert({ label, expires_at: expiresAt, owner_user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as GuestTokenRecord;
}

export async function deleteInbjudan(id: string): Promise<void> {
  const { error } = await supabase.from("guest_tokens").delete().eq("id", id);
  if (error) throw error;
}
