/* Typing shims that let the ported JS compile without touching its runtime
   code. The page logic freely uses `.style`/`.dataset` on `Element` results
   of querySelector and a few DOM expandos; typing each site would mean
   rewriting verified code. Tighten by deleting entries here and fixing the
   fallout, one at a time. */
interface Element {
  style: CSSStyleDeclaration;
  dataset: DOMStringMap;
  offsetWidth: number;
  offsetHeight: number;
  offsetParent: Element | null;
  click(): void;
  // expandos used by applyTheme() / initCopy() / initGalaxy()
  __themeProps?: [string, string, string][] | null;
  _t?: ReturnType<typeof setTimeout>;
  __gal?: any;
}
interface Event {
  key?: string;
  clientX?: number;
  clientY?: number;
  propertyName?: string;
}
interface EventTarget {
  closest?(selector: string): Element | null;
  style?: CSSStyleDeclaration;
}
