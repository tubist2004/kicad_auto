//Helper classes
export enum YesNo {
  yes,
  no,
}

export interface Version {
  version: string;
}

export interface Generator {
  generator: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Offset {
  offset: number;
}

export interface Width {
  width: number;
}

export enum StrokeType {
  dash,
  dash_dot,
  dash_dot_dot,
  dot,
  default,
  solid,
}

export enum FillType {
  none,
  outlined,
  background,
}

export interface Color {
  R: number;
  G: number;
  B: number;
  A: number;
}

export interface Radius {
  radius: number;
}

export interface At {
  x: number;
  y: number;
  angle?: number;
}

export interface Font {
  face?: Face;
  size: Size;
  thickness: Thickness;
  bold?: undefined;
  italic?: undefined;
  line_spacing: LineSpacing;
}

export interface Face {
  faceName: string;
}

export interface Size {
  height: number;
  width: number;
}

export interface Thickness {
  thickness: number;
}

export interface LineSpacing {
  lineSpacing: number;
}

export interface Justify {
  lr?: "left" | "right";
  tb?: "top" | "bottom";
  mirror?: undefined;
}

export interface UnitName {
  unitName: String;
}

//Partly Interfaces
export interface SYMBOL_PROPERTIES {
  property: Array<SymbolProperty>;
}
export interface GRAPHIC_ITEMS {
  arc: Array<Arc>;
  circle: Array<Circle>;
  curve: Array<Curve>;
  polyline: Array<SymbolLine>;
  rectangle: Array<SymbolRectangle>;
  text: Array<SymbolText>;
}

export interface PINS {
  pin: Array<SymbolPin>;
}

export interface UNITS {
  symbol: Array<Symbol>;
}

export interface STROKE_DEFINITION {
  width: Width;
  type: StrokeType;
  color: Color;
}

export interface FILL_DEFINITION {
  type: StrokeType;
}

export interface COORDINATE_POINT_LIST {
  pts: Array<Point>;
}

export interface POSITION_IDENTIFIER {
  at: At;
}

export interface TEXT_EFFECTS {
  effects: TextEffects;
}

//Official Classes

export interface KicadSymbolLib {
  version: string;
  generator: string;
  symbol: Array<Symbol> | Symbol;
}

export interface Symbol extends SYMBOL_PROPERTIES, GRAPHIC_ITEMS, PINS, UNITS {
  library_id: String;
  extends?: String;
  pin_numbers?: undefined;
  pin_names?: {
    offset?: Offset;
    hide?: undefined;
  };
  in_bom: YesNo;
  on_board: YesNo;
  unit_name?: UnitName;
}

export interface SymbolProperty extends POSITION_IDENTIFIER, TEXT_EFFECTS {
  key: String;
  value: String;
  id: string;
}

export interface Arc extends STROKE_DEFINITION, FILL_DEFINITION {
  start: Point;
  mid: Point;
  end: Point;
}

export interface Circle extends STROKE_DEFINITION, FILL_DEFINITION {
  center: Point;
  radius: Radius;
}

export interface Curve
  extends COORDINATE_POINT_LIST,
    STROKE_DEFINITION,
    FILL_DEFINITION {}

export interface SymbolLine
  extends COORDINATE_POINT_LIST,
    STROKE_DEFINITION,
    FILL_DEFINITION {}

export interface SymbolRectangle extends STROKE_DEFINITION, FILL_DEFINITION {
  start: Point;
  end: Point;
}

export interface SymbolText extends POSITION_IDENTIFIER, TEXT_EFFECTS {
  text: String;
}

export interface TextEffects {
  font?: Font;
  justify?: Justify;
  hide?: undefined;
}

export enum ElectricalType {
  input,
  output,
  bidirectional,
  tri_state,
  passive,
  free,
  unspecified,
  power_in,
  power_out,
  open_collector,
  open_emitter,
  no_connect,
}

export enum GraphicalStyle {
  line,
  inverted,
  clock,
  inverted_clock,
  input_low,
  clock_low,
  output_low,
  edge_clock_high,
  non_logic,
}

export interface PIN_ELECTRICAL_TYPE {
  type: ElectricalType;
}

export interface PIN_GRAPHIC_STYLE {
  style: GraphicalStyle;
}

export interface Length {
  length: number;
}

export interface Name extends TEXT_EFFECTS {
  name: String;
}

export interface Number extends TEXT_EFFECTS {
  number: String;
}

export interface SymbolPin extends PIN_ELECTRICAL_TYPE, PIN_GRAPHIC_STYLE {
  length: Length;
  name: Name;
  number: Number;
}

interface Raw {
    toRaw(): any;
}

