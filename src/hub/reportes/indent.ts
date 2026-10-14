import { Extension } from "@tiptap/core";

/**
 * Sangría con Tab / Shift+Tab para párrafos y títulos (también varios a la vez
 * si están seleccionados). En tablas y en el primer párrafo de un punto de
 * lista se deja el Tab de siempre: saltar de celda o anidar el punto.
 */
const MAX_INDENT = 8;
const TYPES = ["paragraph", "heading"];

export const Indent = Extension.create({
  name: "indent",
  // Antes que los atajos de listas y tablas, para poder decidir quién maneja el Tab
  priority: 1001,

  addGlobalAttributes() {
    return [{
      types: TYPES,
      attributes: {
        indent: {
          default: 0,
          parseHTML: (el) => Math.min(MAX_INDENT, Math.max(0, parseInt(el.getAttribute("data-indent") ?? "0", 10) || 0)),
          renderHTML: (attrs) => (attrs.indent
            ? { "data-indent": attrs.indent, style: `margin-left: ${attrs.indent * 2}em` }
            : {}),
        },
      },
    }];
  },

  addKeyboardShortcuts() {
    const leaveToOthers = () => {
      const { $from } = this.editor.state.selection;
      if (this.editor.isActive("table")) return true;
      const d = $from.depth;
      const item = d >= 2 ? $from.node(d - 1) : null;
      // Primer párrafo de un punto de lista: Tab anida el punto
      return !!item && ["listItem", "taskItem"].includes(item.type.name) && $from.index(d - 1) === 0;
    };

    const change = (delta: number) => {
      if (leaveToOthers()) return false;
      const { state, view } = this.editor;
      const { from, to } = state.selection;
      const tr = state.tr;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (!TYPES.includes(node.type.name)) return true;
        const current = Number(node.attrs.indent) || 0;
        const next = Math.min(MAX_INDENT, Math.max(0, current + delta));
        if (next !== current) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
        return false;
      });
      if (tr.docChanged) view.dispatch(tr);
      // Aunque no haya cambio, que el Tab no saque el foco del editor
      return true;
    };

    return {
      Tab: () => change(1),
      "Shift-Tab": () => change(-1),
    };
  },
});
