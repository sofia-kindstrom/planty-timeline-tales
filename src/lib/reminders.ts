import { supabase } from "@/integrations/supabase/client";
import { toLocalDateOnly } from "./chores";

export type PlantReminder = {
  id: string;
  plant_id: string;
  title: string;
  body: string | null;
  remind_at: string; // YYYY-MM-DD
  done_at: string | null;
  created_at: string;
};

/** Förfallna, ej klara påminnelser (remind_at <= idag) för Plantsysslor-fliken. */
export async function listDueReminders(): Promise<PlantReminder[]> {
  const todayStr = toLocalDateOnly(new Date());
  const { data, error } = await supabase
    .from("plant_reminders")
    .select("*")
    .is("done_at", null)
    .lte("remind_at", todayStr)
    .order("remind_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlantReminder[];
}

/** Alla ej klara påminnelser för en växt (oavsett datum), för profilsidan. */
export async function listPlantReminders(plantId: string): Promise<PlantReminder[]> {
  const { data, error } = await supabase
    .from("plant_reminders")
    .select("*")
    .eq("plant_id", plantId)
    .is("done_at", null)
    .order("remind_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlantReminder[];
}

export async function addReminder(input: {
  plant_id: string;
  title: string;
  body: string | null;
  remind_at: string;
}): Promise<void> {
  const { error } = await supabase.from("plant_reminders").insert(input);
  if (error) throw error;
}

export async function updateReminder(
  id: string,
  patch: { title: string; body: string | null; remind_at: string },
): Promise<void> {
  const { error } = await supabase.from("plant_reminders").update(patch).eq("id", id);
  if (error) throw error;
}

export async function markReminderDone(id: string): Promise<void> {
  const { error } = await supabase
    .from("plant_reminders")
    .update({ done_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from("plant_reminders").delete().eq("id", id);
  if (error) throw error;
}
