import { Plant } from "./plants";

export type WaterChore = {
  plant: Plant;
  lastWatered: string | null;
  dueDate: string; // YYYY-MM-DD (lokal tid)
  daysOverdue: number; // negativ = inte förfallen
  shouldGetNutrients: boolean;
};

/** YYYY-MM-DD i lokal tid (inte UTC). */
export function toLocalDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export function addDaysLocalStr(base: Date, days: number): string {
  return toLocalDateOnly(addDays(base, days));
}

export function computeWaterChores(
  plants: Plant[],
  latestWatering: Map<string, string>,
  today: Date = new Date(),
  lastWateringLabel?: Map<string, string>,
  lastRepotting?: Map<string, string>,
): WaterChore[] {
  const todayStr = toLocalDateOnly(today);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const out: WaterChore[] = [];

  for (const plant of plants) {
    if (!plant.watering_interval_days || plant.watering_interval_days <= 0) continue;

    const last = latestWatering.get(plant.id) ?? plant.acquired_at ?? plant.created_at.slice(0, 10);
    const lastDate = parseDateOnly(last.slice(0, 10));
    const due = addDays(lastDate, plant.watering_interval_days);
    const dueStr = toLocalDateOnly(due);

    // Respektera snooze
    if (plant.water_snooze_until && plant.water_snooze_until > todayStr) continue;

    if (dueStr <= todayStr) {
      const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
      const daysOverdue = Math.round((todayMidnight - dueMidnight) / 86400000);

      // Näringsbeslut: varannan vattning, spärrat 6 veckor efter omplantring
      let shouldGetNutrients = false;
      if (lastWateringLabel) {
        const lastLabel = lastWateringLabel.get(plant.id) ?? null;
        shouldGetNutrients = lastLabel !== "Vattnad m. näring";

        if (shouldGetNutrients && lastRepotting) {
          const repottedStr = lastRepotting.get(plant.id);
          if (repottedStr) {
            const repottedMidnight = parseDateOnly(repottedStr.slice(0, 10)).getTime();
            const daysSince = Math.round((todayMidnight - repottedMidnight) / 86400000);
            if (daysSince < 42) shouldGetNutrients = false;
          }
        }
      }

      out.push({
        plant,
        lastWatered: latestWatering.get(plant.id) ?? null,
        dueDate: dueStr,
        daysOverdue,
        shouldGetNutrients,
      });
    }
  }

  // Mest förfallna först
  return out.sort((a, b) => b.daysOverdue - a.daysOverdue);
}
