import { Plant } from "./plants";

export type WaterChore = {
  plant: Plant;
  lastWatered: string | null;
  dueDate: string; // YYYY-MM-DD
  daysOverdue: number; // negativ = inte förfallen
};

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function computeWaterChores(
  plants: Plant[],
  latestWatering: Map<string, string>,
  today: Date = new Date(),
): WaterChore[] {
  const todayStr = toDateOnly(today);
  const out: WaterChore[] = [];

  for (const plant of plants) {
    if (!plant.watering_interval_days || plant.watering_interval_days <= 0) continue;

    const last = latestWatering.get(plant.id) ?? plant.acquired_at ?? plant.created_at.slice(0, 10);
    const lastDate = parseDateOnly(last.slice(0, 10));
    const due = addDays(lastDate, plant.watering_interval_days);
    const dueStr = toDateOnly(due);

    // Respektera snooze
    if (plant.water_snooze_until && plant.water_snooze_until > todayStr) continue;

    if (dueStr <= todayStr) {
      const diffMs = today.setHours(0, 0, 0, 0) - due.setHours(0, 0, 0, 0);
      const daysOverdue = Math.round(diffMs / 86400000);
      out.push({
        plant,
        lastWatered: latestWatering.get(plant.id) ?? null,
        dueDate: dueStr,
        daysOverdue,
      });
    }
  }

  // Mest förfallna först
  return out.sort((a, b) => b.daysOverdue - a.daysOverdue);
}
