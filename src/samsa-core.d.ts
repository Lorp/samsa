/**
 * @fileoverview Created manually by @tomasdev
 * I replaced types that were repeated as common denominators (i.e., SamsaTuple or SamsaGlyphOffset)
 */

declare function getStringFromData(
    data: DataView, p0: number, length: number): string;
declare function uint8ToBase64(buffer: ArrayBufferLike): string;
declare function fvsToCSS(fvs: SamsaFontInstance): string;
declare function copyBytes(
    source: DataView, target: DataView, zs: number, zt: number,
    n: number): void;
declare type SamsaGlyphPoint = [number, number, number];
declare type SamsaTuple = number[];
declare type SamsaGlyphOffset = [number, number];
declare type SamsaGlyphTransform = [number, number, number, number];
declare interface TupleVariationTable {
  peak: SamsaTuple;
  start: SamsaTuple;
  end: SamsaTuple;
  iup: boolean;
  deltas: Array<[number, number]>;
}
declare interface SamsaGlyphComponent {
  glyphId: number;
  flags: number;
  offset: SamsaGlyphOffset;
  matchedPoints: [number, number];
  transform: SamsaGlyphTransform;
}
declare interface SamsaGlyphOptions {
  id: number;
  name: string;
  font: SamsaFont;
  numPoints?: number;
  points?: SamsaGlyphPoint[];
  components?: SamsaGlyphComponent[];
  endPts?: number[];
  tvts?: TupleVariationTable[];
  curveOrder?: number;
}
declare interface DecomposeParams {
  offset: SamsaGlyphOffset, transform: SamsaGlyphTransform, flags: number;
}
declare interface SamsaFontVariationSettings {
  [axis: string]: number;
}
declare interface SamsaFontInstance {
  id: number;
  font: SamsaFont;
  name: string;
  type: string;
  glyphs: SamsaGlyph[];
  tuple: SamsaTuple;
  fvs: SamsaFontVariationSettings;
  static: null|Uint8Array;
  postScriptNameID?: number;
  subfamilyNameID?: number;
  flags?: number;
}
declare class SamsaGlyph implements SamsaGlyphOptions {
  constructor(init: SamsaGlyphOptions);
  id: number;
  name: string;
  font: SamsaFont;
  numPoints?: number;
  points?: SamsaGlyphPoint[];
  components?: SamsaGlyphComponent[];
  endPts?: number[];
  tvts?: TupleVariationTable[];
  curveOrder?: number;
  numContours: number;
  instructionLength: number;
  decompose(tuple?: null|SamsaTuple, params?: null|DecomposeParams): SamsaGlyph;
  instantiate(
      userTuple?: null|SamsaTuple, instance?: null|SamsaFontInstance,
      extra?: {roundDeltas?: boolean}): SamsaGlyph;
  parseTvts(): number|never[];
  recalculateBounds(): false|number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  featureVariationsGlyphId(tuple: SamsaTuple): number;
  svgPath(): string;
  svg(): string;
  ttx(): string;
  json(): string;
  ufo(): string;
}
declare interface SamsaConfig {
  isNode?: boolean;
  outFileDefault?: string;
  instantiation?: {skipTables?: string[]; ignoreIUP?: boolean;};
  defaultGlyph?: string[];
  sfnt?: {maxNumTables?: number; maxSize?: number;};
  glyf?: {overlapSimple?: boolean; bufferSize?: number; compression?: boolean;};
  name?: {maxSize?: number;};
  deltas?: {round?: boolean;};
  purgeGlyphs?: boolean;
  postscriptNames?: string[];
  optimize?: string;
}
declare interface SamsaFontOptions {
  date?: number;
  arrayBuffer?: ArrayBufferLike;
  url?: string;
  callback?: (data: SamsaFont) => void;
  fontFamily?: string;
  inFile?: string;
  outFile?: string;
  filename?: string;
  filesize?: number;
}
declare interface SamsaFontAxis {
  axisNameID: number;
  default: number;
  flags: number;
  id: number;
  max: number;
  min: number;
  name: string;
  tag: string;
}
declare class SamsaFont implements SamsaFontOptions {
  constructor(init: SamsaFontOptions, config?: SamsaConfig);
  config: SamsaConfig;
  date?: number;
  arrayBuffer?: ArrayBufferLike;
  cmap: number[];
  url?: string;
  callback?: (data: SamsaFont) => void;
  fontFamily?: string;
  inFile?: string;
  outFile?: string;
  filename?: string;
  filesize?: number;
  dateCreated: Date;
  data: DataView;
  axes: SamsaFontAxis[];
  axisTagToId: {[tag: string]: number};
  instances: SamsaFontInstance[];
  errors: string[];
  glyphs: SamsaGlyph[];
  glyphOffsets: number[];
  glyphSizes: number[];
  tupleOffsets: number[];
  tupleSizes: number[];
  avar: Array<Array<[number, number]>>;
  path: string;
  load: () => void;
  parse: () => void;
  fingerprint: number;
  dateParsed: Date;
  parseSmallTable: (tag: string) => void;
  parseGlyph: (g: number) => SamsaGlyph;
  exportInstance: (instance: SamsaFontInstance) => Uint8Array;
  getNamedInstances: () => SamsaFontInstance[];
  addInstance:
      (fvs?: SamsaFontVariationSettings|null,
       options?: SamsaFontInstance) => SamsaFontInstance
  makeInstance: (instance: SamsaFontInstance) => void;
  fvsToTuple: (fvs: SamsaFontVariationSettings) => SamsaTuple;
  tupleToFvs: (tuple: SamsaTuple) => SamsaFontVariationSettings;
  axisIndices: (tag: string) => number[];
  axisNormalize:
      (axis: SamsaFontAxis, t: number, avarIgnore?: boolean) => number;
  axisDenormalize: (axis: SamsaFontAxis, t: number) => void;
  defaultGlyphId: () => number;
  featureVariationsGlyphId:
      (g: number, tuple: SamsaTuple) => number | undefined;
  featureVariationsBoxes: (g: number) => Array<Array<[number, number]>>;
  featureVariations?: boolean;
}
declare function instanceApplyVariations(
    font: SamsaFont, instance: SamsaFontInstance): void;
declare class SamsaInstance {
  fvs: SamsaFontVariationSettings;
  tuple: SamsaTuple;
}
declare function quit(obj: {errors?: string[]}): void;
declare namespace CONFIG {
  const isNode: boolean;
  const outFileDefault: string;
  namespace instantiation {
    const skipTables: string[];
    const ignoreIUP: boolean;
  }
  const defaultGlyph: string[];
  namespace sfnt {
    const maxNumTables: number;
    const maxSize: number;
  }
  namespace glyf {
    const overlapSimple: boolean;
    const bufferSize: number;
    const compression: boolean;
  }
  namespace name {
    const maxSize_1: number;
    export {maxSize_1 as maxSize};
  }
  namespace deltas {
    const round: boolean;
  }
  const purgeGlyphs: boolean;
  const postscriptNames: string[];
}
