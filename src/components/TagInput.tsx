import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
};

export function TagInput({ value, onChange, suggestions = [], placeholder = "Lägg till tagg…" }: Props) {
  const [input, setInput] = useState("");

  const add = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (value.includes(t)) { setInput(""); return; }
    onChange([...value, t]);
    setInput("");
  };

  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  const remaining = suggestions.filter((s) => !value.includes(s) && s.includes(input.trim().toLowerCase())).slice(0, 6);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
            {t}
            <button type="button" onClick={() => remove(t)} className="text-muted-foreground hover:text-foreground" aria-label={`Ta bort ${t}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => input && add(input)}
          placeholder={value.length === 0 ? placeholder : ""}
          autoComplete="off"
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
        />
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => add(s)}
              className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
