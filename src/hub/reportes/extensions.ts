import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { TableKit } from "@tiptap/extension-table";
import { ListContinuation } from "./listContinuation";
import { Indent } from "./indent";

// Sin React: lo usan el editor (navegador) y el envío por correo (servidor),
// para que el reporte se vea igual en los dos lados.

/**
 * Imagen con marca de "subiendo": mientras se sube se muestra la vista previa
 * local (blob:) con uploadId; al terminar se cambia por la URL definitiva.
 */
export const ReportImage = Image.extend({
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
