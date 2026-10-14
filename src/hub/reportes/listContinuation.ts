import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

/**
 * Texto que continúa dentro de un punto de lista, como en Notion:
 *  - ⌫ al inicio de un punto (que no sea el primero) quita la viñeta o el número
 *    y deja el texto dentro del punto anterior, con la misma sangría.
 *  - Enter en ese texto crea otra línea alineada, sin número. En una línea
 *    vacía al final del punto vuelve al comportamiento normal (punto nuevo).
 *  - Tab en ese texto le da sangría (extensión Indent), sin mover todo el punto.
 */
const ITEM_TYPES = ["listItem"];

export const ListContinuation = Extension.create({
  name: "listContinuation",
  // Antes que los atajos propios de las listas
  priority: 1000,

  addKeyboardShortcuts() {
    /** Párrafo con el cursor, si está directamente dentro de un punto de lista */
    const context = () => {
      const { state } = this.editor;
      const { selection } = state;
      if (!selection.empty) return null;
      const $from = selection.$from;
      const d = $from.depth;
      if (d < 3 || $from.parent.type.name !== "paragraph") return null;
      const item = $from.node(d - 1);
      if (!ITEM_TYPES.includes(item.type.name)) return null;
      return { state, $from, d, item, indexInItem: $from.index(d - 1), indexInList: $from.index(d - 2) };
    };

    return {
      Backspace: () => {
        const c = context();
        if (!c || c.$from.parentOffset !== 0 || c.indexInItem !== 0 || c.indexInList === 0) return false;
        const itemStart = c.$from.before(c.d - 1);
        const itemEnd = c.$from.after(c.d - 1);
        const tr = c.state.tr;
        tr.delete(itemStart, itemEnd);
        // Al final del contenido del punto anterior
        tr.insert(itemStart - 1, c.item.content);
        tr.setSelection(TextSelection.create(tr.doc, itemStart));
        this.editor.view.dispatch(tr.scrollIntoView());
        return true;
      },

      Enter: () => {
        const c = context();
        if (!c || c.indexInItem === 0) return false;
        const isLast = c.indexInItem === c.item.childCount - 1;
        // Línea vacía al final del punto: dejar que la lista cree el punto siguiente
        if (isLast && c.$from.parent.content.size === 0) {
          const tr = c.state.tr;
          const from = c.$from.before(c.d);
          const itemEnd = c.$from.after(c.d - 1);
          // Quitar la línea vacía y abrir un punto nuevo después de este
          tr.delete(from, c.$from.after(c.d));
          const listItem = c.state.schema.nodes[c.item.type.name];
          const paragraph = c.state.schema.nodes.paragraph;
          const at = tr.mapping.map(itemEnd);
          tr.insert(at, listItem.create(null, paragraph.create()));
          tr.setSelection(TextSelection.create(tr.doc, at + 2));
          this.editor.view.dispatch(tr.scrollIntoView());
          return true;
        }
        return this.editor.commands.splitBlock();
      },
    };
  },
});
