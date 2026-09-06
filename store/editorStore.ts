import { create } from "zustand";
import {
  EditorElement,
  EditorState,
  EditorTool,
} from "@/types/editor";

interface ExtendedEditorState extends EditorState {
  past: {
    elements: EditorElement[];
    pageRotations: Record<number, number>;
    deletedPages: number[];
  }[];
  future: {
    elements: EditorElement[];
    pageRotations: Record<number, number>;
    deletedPages: number[];
  }[];
}

interface EditorActions {
  setTool: (tool: EditorTool) => void;
  setActivePage: (page: number) => void;
  setZoom: (zoom: number) => void;

  // Formatting tool settings
  setTextColor: (color: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setHighlightColor: (color: string) => void;

  // Elements
  addElement: (element: EditorElement) => void;
  addExtractedElements: (newElements: EditorElement[]) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;

  // Page manipulations
  markPageInitialized: (pageNumber: number) => void;
  rotatePage: (pageNumber: number) => void;
  deletePage: (pageNumber: number) => void;

  // History
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  resetEditor: () => void;
}

const MAX_HISTORY = 50;

export const useEditorStore = create<
  ExtendedEditorState & EditorActions
>((set, get) => ({
  activeTool: "select",
  activePage: 1,
  zoom: 1.2,
  elements: [],
  selectedElementId: null,

  initializedPages: {},
  pageRotations: {},
  deletedPages: [],

  currentTextColor: "#000000",
  currentFontSize: 16,
  currentFontFamily: "Helvetica",
  currentStrokeColor: "#000000",
  currentStrokeWidth: 3,
  currentHighlightColor: "#ffeb3b",

  past: [],
  future: [],

  setTool: (tool) => set({ activeTool: tool }),
  setActivePage: (page) => set({ activePage: page }),
  setZoom: (zoom) => set({ zoom }),

  setTextColor: (color) => {
    set({ currentTextColor: color });
    const { selectedElementId, updateElement } = get();
    if (selectedElementId) {
      updateElement(selectedElementId, { color } as any);
    }
  },

  setFontSize: (size) => {
    set({ currentFontSize: size });
    const { selectedElementId, updateElement } = get();
    if (selectedElementId) {
      updateElement(selectedElementId, { fontSize: size } as any);
    }
  },

  setFontFamily: (font) => {
    set({ currentFontFamily: font });
    const { selectedElementId, updateElement } = get();
    if (selectedElementId) {
      updateElement(selectedElementId, { fontFamily: font } as any);
    }
  },

  setStrokeColor: (color) => {
    set({ currentStrokeColor: color });
    const { selectedElementId, updateElement } = get();
    if (selectedElementId) {
      updateElement(selectedElementId, { strokeColor: color } as any);
    }
  },

  setStrokeWidth: (width) => {
    set({ currentStrokeWidth: width });
    const { selectedElementId, updateElement } = get();
    if (selectedElementId) {
      updateElement(selectedElementId, { strokeWidth: width } as any);
    }
  },

  setHighlightColor: (color) => {
    set({ currentHighlightColor: color });
    const { selectedElementId, updateElement } = get();
    if (selectedElementId) {
      updateElement(selectedElementId, { color } as any);
    }
  },

  saveHistory: () => {
    const { elements, pageRotations, deletedPages, past } = get();
    const snapshot = {
      elements: JSON.parse(JSON.stringify(elements)),
      pageRotations: { ...pageRotations },
      deletedPages: [...deletedPages],
    };
    set({
      past: [...past.slice(-MAX_HISTORY), snapshot],
      future: [],
    });
  },

  addElement: (element) => {
    const { saveHistory, elements } = get();
    saveHistory();
    set({
      elements: [...elements, element],
    });
  },

  addExtractedElements: (newElements) => {
    const { elements } = get();
    // Append without pushing to undo history so initial parsing doesn't pollute undo stack
    set({
      elements: [...elements, ...newElements],
    });
  },

  updateElement: (id, updates) => {
    const { elements } = get();
    set({
      elements: elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as EditorElement) : el
      ),
    });
  },

  deleteElement: (id) => {
    const { saveHistory, elements, selectedElementId } = get();
    saveHistory();
    set({
      elements: elements.filter((el) => el.id !== id),
      selectedElementId: selectedElementId === id ? null : selectedElementId,
    });
  },

  selectElement: (id) => set({ selectedElementId: id }),

  markPageInitialized: (pageNumber) => {
    const { initializedPages } = get();
    set({
      initializedPages: {
        ...initializedPages,
        [pageNumber]: true,
      },
    });
  },

  rotatePage: (pageNumber) => {
    const { saveHistory, pageRotations } = get();
    saveHistory();
    const currentAngle = pageRotations[pageNumber] || 0;
    const newAngle = (currentAngle + 90) % 360;
    set({
      pageRotations: {
        ...pageRotations,
        [pageNumber]: newAngle,
      },
    });
  },

  deletePage: (pageNumber) => {
    const { saveHistory, deletedPages, selectedElementId, elements } = get();
    saveHistory();
    set({
      deletedPages: [...deletedPages, pageNumber],
      elements: elements.filter((el) => el.page !== pageNumber),
      selectedElementId: null,
    });
  },

  undo: () => {
    const { past, future, elements, pageRotations, deletedPages } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const currentSnapshot = {
      elements: JSON.parse(JSON.stringify(elements)),
      pageRotations: { ...pageRotations },
      deletedPages: [...deletedPages],
    };

    set({
      past: newPast,
      future: [currentSnapshot, ...future],
      elements: previous.elements,
      pageRotations: previous.pageRotations,
      deletedPages: previous.deletedPages,
    });
  },

  redo: () => {
    const { past, future, elements, pageRotations, deletedPages } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);
    const currentSnapshot = {
      elements: JSON.parse(JSON.stringify(elements)),
      pageRotations: { ...pageRotations },
      deletedPages: [...deletedPages],
    };

    set({
      past: [...past, currentSnapshot],
      future: newFuture,
      elements: next.elements,
      pageRotations: next.pageRotations,
      deletedPages: next.deletedPages,
    });
  },

  resetEditor: () =>
    set({
      elements: [],
      selectedElementId: null,
      initializedPages: {},
      pageRotations: {},
      deletedPages: [],
      past: [],
      future: [],
      activePage: 1,
    }),
}));
