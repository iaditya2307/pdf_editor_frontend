import { create } from "zustand";

import {
  EditorElement,
  EditorState,
  EditorTool,
} from "@/types/editor";

interface ExtendedEditorState extends EditorState {
  past: EditorElement[][];
  future: EditorElement[][];
}

interface EditorActions {
  setTool: (tool: EditorTool) => void;

  setActivePage: (page: number) => void;

  setZoom: (zoom: number) => void;

  addElement: (element: EditorElement) => void;

  updateElement: (
    id: string,
    updates: Partial<EditorElement>
  ) => void;

  deleteElement: (id: string) => void;

  selectElement: (id: string | null) => void;

  undo: () => void;

  redo: () => void;
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

  past: [],

  future: [],

  setTool: (tool) =>
    set({
      activeTool: tool,
    }),

  setActivePage: (page) =>
    set({
      activePage: page,
    }),

  setZoom: (zoom) =>
    set({
      zoom,
    }),

  addElement: (element) => {
    const currentElements = get().elements;
    const currentPast = get().past;

    set({
      past: [...currentPast.slice(-MAX_HISTORY), currentElements],
      future: [],
      elements: [...currentElements, element],
    });
  },

  updateElement: (id, updates) => {
    const currentElements = get().elements;
    const hasChange = currentElements.some(
      (el) => el.id === id
    );

    if (!hasChange) return;

    const currentPast = get().past;
    set({
      past: [...currentPast.slice(-MAX_HISTORY), currentElements],
      future: [],
      elements: currentElements.map((element) =>
        element.id === id
          ? {
              ...element,
              ...updates,
            }
          : element
      ),
    });
  },

  deleteElement: (id) => {
    const currentElements = get().elements;
    const currentPast = get().past;

    set({
      past: [...currentPast.slice(-MAX_HISTORY), currentElements],
      future: [],
      elements: currentElements.filter(
        (element) => element.id !== id
      ),
      selectedElementId:
        get().selectedElementId === id
          ? null
          : get().selectedElementId,
    });
  },

  selectElement: (id) =>
    set({
      selectedElementId: id,
    }),

  undo: () => {
    const { past, future, elements } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    set({
      past: newPast,
      future: [elements, ...future],
      elements: previous,
    });
  },

  redo: () => {
    const { past, future, elements } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      past: [...past, elements],
      future: newFuture,
      elements: next,
    });
  },
}));
