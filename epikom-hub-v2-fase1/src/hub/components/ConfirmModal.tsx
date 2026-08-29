interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmLabel = "Confirmar", danger = false, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-pop-in">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: danger ? "#ef444420" : "#31b49820" }}
          >
            {danger ? "⚠️" : "🤔"}
          </div>
          <div>
            <h3 className="font-display text-xl font-700 uppercase text-ink leading-tight">{title}</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="text-xs font-mono px-5 py-2 rounded-lg font-600 transition-all hover:opacity-90"
            style={danger
              ? { background: "#ef4444", color: "#fff" }
              : { background: "var(--color-primary)", color: "var(--color-bg)" }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
