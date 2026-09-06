export type EditorTool =
    | "select"
    | "text"
    | "draw"
    | "highlight"
    | "rectangle"
    | "image";

export interface Position {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface TextElement {
    id: string;
    type: "text";

    page: number;

    position: Position;
    size: Size;

    text: string;

    fontSize: number;
    fontFamily: string;

    color: string;
}

export type EditorElement = TextElement;

export interface EditorState {
    activeTool: EditorTool;

    activePage: number;

    zoom: number;

    elements: EditorElement[];

    selectedElementId: string | null;
}