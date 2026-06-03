// Standardhändelser med emoji-ikoner
export const EVENT_PRESETS: { label: string; emoji: string }[] = [
  { label: "Vattnad", emoji: "💧" },
  { label: "Vattnad m. näring", emoji: "🧪" },
  { label: "Beskuren", emoji: "✂️" },
  { label: "Omplanterad", emoji: "🪴" },
  { label: "Roterad", emoji: "🔄" },
  { label: "Annat", emoji: "📝" },
];

const map = new Map(EVENT_PRESETS.map((p) => [p.label, p.emoji]));

export function emojiForLabel(label: string): string | null {
  return map.get(label) ?? null;
}
