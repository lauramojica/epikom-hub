import { useRef, useState } from "react";
import type { AttachedFile } from "../types";
import { useUpload } from "../UploadContext";

const fileIcon = (type: string) => {
  if (type.startsWith("image/")) return "🖼";
  if (type === "application/pdf") return "📄";
  if (type.includes("word")) return "📝";
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return "📊";
  if (type.includes("zip") || type.includes("rar")) return "🗜";
  if (type.startsWith("video/")) return "🎬";
  return "📎";
};

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

interface Props {
  files: AttachedFile[];
  onAdd: (file: AttachedFile) => void;
  onRemove: (id: string) => void;
  compact?: boolean;
}

export default function FileUpload({ files, onAdd, onRemove, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const upload = useUpload();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setUploading(true);
    for (const f of Array.from(fileList)) {
      let url = URL.createObjectURL(f);
      if (upload) {
        try {
          const res = await upload(f, "adjuntos");
          url = res.url;
        } catch (e) {
          console.error("upload error:", e);
        }
      }
      onAdd({ id: `f${Date.now()}-${Math.random().toString(36).slice(2)}`, name: f.name, size: f.size, type: f.type, url, uploadedAt: new Date().toISOString().slice(0, 10) });
    }
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl cursor-pointer transition-all text-center select-none ${
          compact ? "py-3 px-4" : "py-6 px-4"
        } ${dragging ? "border-primary bg-primary/5" : "border-line hover:border-muted"}`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <p className="text-sm text-muted">{uploading ? "Subiendo…" : dragging ? "Suelta los archivos aquí" : "Arrastra archivos o haz clic para subir"}</p>
        {!compact && <p className="text-[10px] font-mono text-muted/50 mt-1">PDF, imágenes, videos, documentos</p>}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5 bg-surface2 border border-line rounded-lg px-3 py-2 group">
              <span className="text-base flex-shrink-0">{fileIcon(f.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-500 text-ink truncate">{f.name}</p>
                <p className="text-[10px] font-mono text-muted">{fmtSize(f.size)} · {f.uploadedAt}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <a href={f.url} download={f.name} className="opacity-0 group-hover:opacity-100 text-muted hover:text-ink transition-all">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1V8M3 6L6 9L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </a>
                <button onClick={() => onRemove(f.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
