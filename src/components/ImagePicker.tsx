import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadPlantImage } from "@/lib/plants";
import { toast } from "sonner";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: "square" | "video";
  label?: string;
};

export function ImagePicker({ value, onChange, aspect = "square", label = "Bild" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadPlantImage(file);
      onChange(url);
    } catch (e: any) {
      toast.error("Kunde inte ladda upp bild: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative w-full ${aspect === "square" ? "aspect-square" : "aspect-video"} cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary/40 transition hover:bg-secondary/70`}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            {uploading ? (
              <span className="text-sm">Laddar upp…</span>
            ) : (
              <>
                <Camera className="h-8 w-8" />
                <span className="text-sm">Tryck för att lägga till foto</span>
              </>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {value && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Byt bild
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Ta bort
          </Button>
        </div>
      )}
    </div>
  );
}
