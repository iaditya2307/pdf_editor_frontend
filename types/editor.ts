export type EditorTool =
  | "select"
  | "text"
  | "draw"
  | "highlight"
  | "rectangle"
  | "circle"
  | "line"
  | "image";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  page: number;
  position: Position;
  size: Size;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  isBold?: boolean;
  isItalic?: boolean;
  isOriginalPdfText?: boolean;
  originalText?: string;
  originalPosition?: Position;
  originalSize?: Size;
}

export interface DrawElement extends BaseElement {
  type: "draw";
  points: Position[];
  strokeColor: string;
  strokeWidth: number;
}

export interface HighlightElement extends BaseElement {
  type: "highlight";
  color: string;
  opacity: number;
}

export interface ShapeElement extends BaseElement {
  type: "rectangle" | "circle" | "line";
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  aspectRatio?: number;
}

export type EditorElement =
  | TextElement
  | DrawElement
  | HighlightElement
  | ShapeElement
  | ImageElement;

export interface EditorState {
  activeTool: EditorTool;
  activePage: number;
  zoom: number;
  elements: EditorElement[];
  selectedElementId: string | null;
  initializedPages: Record<number, boolean>;
  pageRotations: Record<number, number>;
  deletedPages: number[];
  currentTextColor: string;
  currentFontSize: number;
  currentFontFamily: string;
  currentStrokeColor: string;
  currentStrokeWidth: number;
  currentHighlightColor: string;
}