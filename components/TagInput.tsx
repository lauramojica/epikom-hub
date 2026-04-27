"use client";

import { useId, useRef, useState } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[]; // tipos ya usados en el sistema (autocomplete)
  placeholder?: string;
  maxLength?: number;
};

/**
 * Tag input estilo Notion: chips + input free-form. Enter o coma confirman.
 * Sugiere de `suggestions` mientras escribes; si tu tag no existe en la lista,
 * igual lo crea como nuevo tag.
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Escribe y presiona Enter…",
  maxLength = 40,
}: Props) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const clean = raw.trim();
    if (!clean || clean.length > maxLength) return;
    if (value.some((v) => v.toLowerCase() === clean.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, clean]);
    setDraft("");
    setOpen(false);
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  const lowerDraft = draft.toLowerCase().trim();
  const filteredSuggestions = suggestions
    .filter(
      (s) =>
        !value.some((v) => v.toLowerCase() === s.toLowerCase()) &&
        (lowerDraft === "" || s.toLowerCase().includes(lowerDraft))
    )
    .slice(0, 8);

  const showCreate =
    lowerDraft.length > 0 &&
    !suggestions.some((s) => s.toLowerCase() === lowerDraft) &&
    !value.some((v) => v.toLowerCase() === lowerDraft);

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-md p-1.5"
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          minHeight: 36,
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px]"
            style={{
              background: i === 0 ? "var(--brand-turquesa-soft)" : "var(--bg)",
              color: i === 0 ? "var(--brand-turquesa-ink)" : "var(--text)",
              border: "1px solid var(--border)",
            }}
            title={i === 0 ? "Tipo principal" : undefined}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(tag);
              }}
              aria-label={`Quitar ${tag}`}
              style={{ color: "var(--text-3)", lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(draft);
            } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[100px] bg-transparent text-[13px]"
          style={{
            outline: "none",
            border: "none",
            color: "var(--text)",
            fontFamily: "inherit",
            padding: "2px 4px",
          }}
          maxLength={maxLength}
        />
      </div>

      {open && (filteredSuggestions.length > 0 || showCreate) && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-auto rounded-md py-1 text-[13px]"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              className="block w-full px-3 py-1.5 text-left transition"
              style={{
                color: "var(--text)",
                background: "transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {s}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(draft);
              }}
              className="block w-full px-3 py-1.5 text-left text-[12px]"
              style={{ color: "var(--brand-turquesa-ink)" }}
            >
              + Crear &ldquo;{draft.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
