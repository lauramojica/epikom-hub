"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { TableKit } from "@tiptap/extension-table";
import { ListContinuation } from "./listContinuation";
import { Indent } from "./indent";

interface Props {
  /** Cambiar la key del componente para cargar otro documento */
  initialContent: JSONContent | null;
  editable: boolean;
  onChange?: (doc: JSONContent) => void;
  onUploadImage?: (file: File) => Promise<string>;
  onError?: (message: string) => void;
  placeholder?: string;
}

/**
 * Imagen con marca de "subiendo": mientras se sube se muestra la vista previa
 * local (blob:) con uploadId; al terminar se cambia por la URL definitiva.
 */
const ReportImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      uploadId: {
        default: null,
        parseHTML: () => null,
        renderHTML: (attrs) => (attrs.uploadId ? { "data-uploading": "true" } : {}),
      },
    };
  },
});

function findUpload(doc: PMNode, id: string): { node: PMNode; pos: number } | null {
  let found: { node: PMNode; pos: number } | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "image" && node.attrs.uploadId === id) found = { node, pos };
  });
  return found;
}

function hasPendingUploads(doc: PMNode): boolean {
  let pending = false;
  doc.descendants((node) => {
    if (node.type.name === "image" && node.attrs.uploadId) pending = true;
    return !pending;
  });
  return pending;
}

export function reportExtensions(placeholder = "") {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } },
    }),
    ReportImage.configure({ allowBase64: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    // Tablas: también conserva las que se pegan desde Notion, Word o una página web
    TableKit.configure({ table: { resizable: true, cellMinWidth: 60 } }),
    Placeholder.configure({ placeholder }),
    ListContinuation,
    Indent,
  ];
}

/** Los saltos de línea entre <tr> y <td> del HTML se convertirían en filas vacías */
function stripTableWhitespace(root: HTMLElement) {
  root.querySelectorAll("table, thead, tbody, tfoot, tr, colgroup").forEach((el) => {
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()) n.remove();
    });
  });
}

/**
 * Convierte en checklist real las listas con casillas que vienen de afuera:
 *  - Notion: <div class="checkbox checkbox-on"> o clases "to-do"
 *  - Páginas web / GitHub: <input type="checkbox" checked>
 *  - Texto: "[ ]", "[x]", "☐", "☑", "✅" al inicio del ítem
 */
const CHECK_PREFIX = /^\s*(\[( |x|X)\]|☐|☑|☒|✅|✔️?)\s*/;

function convertChecklists(root: HTMLElement) {
  root.querySelectorAll("li").forEach((li) => {
    if (li.getAttribute("data-type") === "taskItem") return;
    let checked: boolean | null = null;

    const input = li.querySelector(":scope > input[type=checkbox], :scope > label > input[type=checkbox], :scope > p > input[type=checkbox]");
    const box = li.querySelector(':scope > [class*="checkbox"], :scope > div > [class*="checkbox"]');
    if (input instanceof HTMLInputElement) {
      checked = input.checked || input.hasAttribute("checked");
      (input.closest("label") ?? input).remove();
    } else if (box) {
      checked = /checkbox-on|checked/.test(box.className);
      box.remove();
    } else if (/to-do/.test(li.parentElement?.className ?? "")) {
      checked = !!li.querySelector('[class*="to-do-children-checked"]');
    } else {
      // Prefijo de texto en el primer nodo con contenido
      const walker = li.ownerDocument.createTreeWalker(li, NodeFilter.SHOW_TEXT);
      let t = walker.nextNode();
      while (t && !t.textContent?.trim()) t = walker.nextNode();
      const m = t?.textContent?.match(CHECK_PREFIX);
      if (t && m) {
        checked = !/\[ \]|☐/.test(m[1]);
        t.textContent = t.textContent!.slice(m[0].length);
      }
    }

    if (checked === null) return;
    li.setAttribute("data-type", "taskItem");
    li.setAttribute("data-checked", String(checked));
    li.parentElement?.setAttribute("data-type", "taskList");
  });
}

/** Limpieza común para lo que se pega o se importa */
function cleanIncomingHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, link, meta, title").forEach((n) => n.remove());
  stripTableWhitespace(doc.body);
  convertChecklists(doc.body);
  return doc.body.innerHTML;
}

/** Espera a que el navegador tenga la imagen en caché (o falle, o pasen 20 s) */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const done = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, 20000);
    img.onload = done;
    img.onerror = done;
    img.src = src;
  });
}

const imagesFrom = (list: FileList | null | undefined) =>
  Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));

export default function RichEditor({ initialContent, editable, onChange, onUploadImage, onError, placeholder }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const htmlRef = useRef<HTMLInputElement>(null);
  // Refs para que los handlers del editor (creados una sola vez) vean las props actuales
  const uploadRef = useRef(onUploadImage);
  const errorRef = useRef(onError);
  const changeRef = useRef(onChange);
  const editorRef = useRef<Editor | null>(null);
  const [uploading, setUploading] = useState(0);
  useEffect(() => {
    uploadRef.current = onUploadImage;
    errorRef.current = onError;
    changeRef.current = onChange;
  });

  const insertImages = async (editor: Editor, files: File[], pos?: number) => {
    const upload = uploadRef.current;
    if (!upload || !files.length) return;

    // 1. Vista previa inmediata, marcada como "subiendo"
    let at = Math.min(pos ?? editor.state.selection.from, editor.state.doc.content.size);
    const pending = files.map((file) => {
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      const node = editor.schema.nodes.image.create({ src: preview, alt: file.name, uploadId: id });
      const tr = editor.state.tr.replaceRangeWith(at, at, node);
      editor.view.dispatch(tr);
      at = tr.mapping.map(at);
      return { id, file, preview };
    });
    setUploading((n) => n + pending.length);

    // 2. Subir y cambiar por la URL definitiva (o quitar si falla)
    await Promise.all(pending.map(async ({ id, file, preview }) => {
      try {
        const src = await upload(file);
        // Descargar la definitiva antes de cambiarla: si no, entre la vista
        // previa y la imagen del servidor queda un hueco y parece que no se pegó
        await preloadImage(src);
        if (editor.isDestroyed) return;
        const hit = findUpload(editor.state.doc, id);
        if (hit) editor.view.dispatch(editor.state.tr.setNodeMarkup(hit.pos, undefined, { ...hit.node.attrs, src, uploadId: null }));
      } catch (e) {
        if (!editor.isDestroyed) {
          const hit = findUpload(editor.state.doc, id);
          if (hit) editor.view.dispatch(editor.state.tr.delete(hit.pos, hit.pos + hit.node.nodeSize));
        }
        const detail = e && typeof e === "object" && "message" in e ? `: ${String((e as { message: unknown }).message)}` : "";
        errorRef.current?.(`No se pudo subir “${file.name}”${detail}`);
      } finally {
        URL.revokeObjectURL(preview);
        setUploading((n) => n - 1);
      }
    }));
  };

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: reportExtensions(placeholder),
    content: initialContent ?? "",
    editorProps: {
      attributes: { class: "report-doc focus:outline-none min-h-[240px]" },
      transformPastedHTML: cleanIncomingHtml,
      handlePaste: (_view, event) => {
        const files = imagesFrom(event.clipboardData?.files);
        if (!files.length || !editorRef.current) return false;
        insertImages(editorRef.current, files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = imagesFrom(event.dataTransfer?.files);
        if (!files.length || !editorRef.current) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertImages(editorRef.current, files, pos);
        return true;
      },
    },
    // Mientras haya imágenes subiendo no se guarda: la vista previa (blob:) no
    // sirve fuera de esta pestaña. Al terminar la subida se guarda solo.
    onUpdate: ({ editor }) => {
      if (!hasPendingUploads(editor.state.doc)) changeRef.current?.(editor.getJSON());
    },
  });

  useEffect(() => { editorRef.current = editor; }, [editor]);
  useEffect(() => { editor?.setEditable(editable); }, [editor, editable]);

  if (!editor) return <div className="min-h-[240px]" />;

  return (
    <div>
      {editable && <Toolbar editor={editor} uploading={uploading} onPickImage={() => fileRef.current?.click()} onImportHtml={() => htmlRef.current?.click()} canUpload={!!onUploadImage} />}
      <input
        ref={htmlRef} type="file" accept=".html,.htm,text/html" className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          // El esquema del editor solo deja pasar lo que conoce (texto, listas,
          // tablas, imágenes, enlaces): scripts y estilos se descartan.
          editor.chain().focus().insertContent(cleanIncomingHtml(await file.text())).run();
        }}
      />
      <input
        ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { insertImages(editor, imagesFrom(e.target.files)); e.target.value = ""; }}
      />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, uploading, onPickImage, onImportHtml, canUpload }: {
  editor: Editor; uploading: number; onPickImage: () => void; onImportHtml: () => void; canUpload: boolean;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("codeBlock"),
      link: e.isActive("link"),
      table: e.isActive("table"),
    }),
  });

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enlace", prev ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const c = () => editor.chain().focus();
  const items: { label: string; title: string; active?: boolean; run: () => void; className?: string }[] = [
    { label: "H1", title: "Título", active: s.h1, run: () => c().toggleHeading({ level: 1 }).run() },
    { label: "H2", title: "Subtítulo", active: s.h2, run: () => c().toggleHeading({ level: 2 }).run() },
    { label: "H3", title: "Encabezado pequeño", active: s.h3, run: () => c().toggleHeading({ level: 3 }).run() },
    { label: "B", title: "Negrita (Ctrl+B)", active: s.bold, run: () => c().toggleBold().run(), className: "font-700" },
    { label: "I", title: "Cursiva (Ctrl+I)", active: s.italic, run: () => c().toggleItalic().run(), className: "italic" },
    { label: "S", title: "Tachado", active: s.strike, run: () => c().toggleStrike().run(), className: "line-through" },
    { label: "•", title: "Lista", active: s.bullet, run: () => c().toggleBulletList().run() },
    { label: "1.", title: "Lista numerada", active: s.ordered, run: () => c().toggleOrderedList().run() },
    { label: "☑", title: "Checklist", active: s.task, run: () => c().toggleTaskList().run() },
    { label: "❝", title: "Cita", active: s.quote, run: () => c().toggleBlockquote().run() },
    { label: "</>", title: "Código o rutas", active: s.code, run: () => c().toggleCodeBlock().run() },
    { label: "🔗", title: "Enlace", active: s.link, run: setLink },
    { label: "—", title: "Separador", run: () => c().setHorizontalRule().run() },
    { label: "▦ Tabla", title: "Insertar tabla", active: s.table, run: () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  ];

  const tableItems: { label: string; title: string; run: () => void; danger?: boolean }[] = [
    { label: "+ Fila", title: "Agregar fila debajo", run: () => c().addRowAfter().run() },
    { label: "+ Columna", title: "Agregar columna a la derecha", run: () => c().addColumnAfter().run() },
    { label: "− Fila", title: "Quitar esta fila", run: () => c().deleteRow().run() },
    { label: "− Columna", title: "Quitar esta columna", run: () => c().deleteColumn().run() },
    { label: "Encabezado", title: "Activar o quitar la fila de encabezado", run: () => c().toggleHeaderRow().run() },
    { label: "Borrar tabla", title: "Eliminar toda la tabla", run: () => c().deleteTable().run(), danger: true },
  ];

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 py-2 mb-3 bg-surface border-b border-line">
      {items.map((it) => (
        <button
          key={it.title} type="button" title={it.title} onClick={it.run}
          className={`min-w-8 h-8 px-2 rounded-md text-xs font-mono transition-colors ${it.className ?? ""} ${it.active ? "bg-primary/15 text-primary" : "text-muted hover:text-ink hover:bg-surface2"}`}
        >
          {it.label}
        </button>
      ))}
      {canUpload && (
        <button type="button" title="Insertar imagen (también puedes pegarla con Ctrl+V)" onClick={onPickImage}
          className="h-8 px-2 rounded-md text-xs font-mono text-muted hover:text-ink hover:bg-surface2">
          🖼 Imagen
        </button>
      )}
      <button type="button" title="Traer el contenido de un archivo .html (por ejemplo un reporte anterior)" onClick={onImportHtml}
        className="h-8 px-2 rounded-md text-xs font-mono text-muted hover:text-ink hover:bg-surface2">
        📄 Importar HTML
      </button>
      {uploading > 0 && (
        <span className="ml-auto flex items-center gap-2 h-8 px-3 rounded-md bg-primary/15 text-primary text-xs font-mono">
          <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Subiendo {uploading === 1 ? "1 imagen" : `${uploading} imágenes`}…
        </span>
      )}
      {s.table && (
        <div className="w-full flex flex-wrap items-center gap-1 pt-1 mt-1 border-t border-line">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted mr-1">Tabla</span>
          {tableItems.map((it) => (
            <button key={it.label} type="button" title={it.title} onClick={it.run}
              className={`h-7 px-2 rounded-md text-xs font-mono hover:bg-surface2 ${it.danger ? "text-danger" : "text-muted hover:text-ink"}`}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
