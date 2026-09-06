import { create } from "zustand";

import {
  EditorElement,
  EditorState,
  EditorTool,
} from "@/types/editor";

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
}

export const useEditorStore = create<
  EditorState & EditorActions
>((set) => ({
  activeTool: "select",

  activePage: 1,

  zoom: 1.2,

  elements: [],

  selectedElementId: null,

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

  addElement: (element) =>
    set((state) => ({
      elements: [
        ...state.elements,
        element,
      ],
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((element) =>
        element.id === id
          ? {
              ...element,
              ...updates,
            }
          : element
      ),
    })),

  deleteElement: (id) =>
    set((state) => ({
      elements: state.elements.filter(
        (element) => element.id !== id
      ),

      selectedElementId:
        state.selectedElementId === id
          ? null
          : state.selectedElementId,
    })),

  selectElement: (id) =>
    set({
      selectedElementId: id,
    }),
}));
