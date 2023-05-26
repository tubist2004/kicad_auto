import * as fs from "fs";

interface Element {
  isAtom: boolean;
}

export interface Atom extends Element {
  value: string;
  isQuoted: boolean;
}

export interface SExpr extends Element {
  childs: Array<Atom | SExpr>;
}

export function findElement(sExpr: SExpr, path: string[]): SExpr[] {
  let sExprs = sExpr.childs.filter((child) => !child.isAtom) as SExpr[];
  let next = sExprs.filter(
    (child) => (child.childs[0] as Atom).value == path[0]
  );
  if (path.length == 1) return next;
  return findElement(next[0], path.slice(1));
}

export function serializeSExp(expr: SExpr, n: number): string {
  return (
    "\n(" +
    expr.childs
      .map((child) => {
        if (child.isAtom) {
          const atom = child as Atom;
          if (atom.isQuoted) {
            return '"' + atom.value + '"';
          } else {
            return atom.value;
          }
        } else {
          const sExpr = child as SExpr;
          return serializeSExp(sExpr, n + 1);
        }
      })
      .join(" ") +
    ")"
  );
}

function parse(lexed: string[]) {
  let stree: SExpr = { childs: [], isAtom: false };
  let spath = [stree];
  lexed.forEach((l) => {
    const isQuoted = l.charAt(0) == '"';
    const last = spath[spath.length - 1];
    if (l == "(") {
      const nsexpr: SExpr = {
        childs: [],
        isAtom: false,
      };
      last.childs.push(nsexpr);
      spath.push(nsexpr);
    } else if (l == ")") {
      spath.pop();
    } else if (isQuoted) {
      last.childs.push({
        value: l.slice(1, -1),
        isQuoted: true,
        isAtom: true,
      });
    } else {
      last.childs.push({ value: l, isQuoted: false, isAtom: true });
    }
  });
  return stree;
}

function lex(text: string) {
  let lexed = [];
  enum Mode {
    TXT,
    QUOTED,
    ESCAPED,
  }
  let mode: Mode = Mode.TXT;
  let lastStr = "";
  for (let i = 0; i < text.length; i++) {
    let c = text.charAt(i);
    switch (mode) {
      case Mode.TXT:
        switch (c) {
          case "(":
          case ")":
            if (lastStr != "") {
              lexed.push(lastStr);
              lastStr = "";
            }
            lexed.push(c);
            break;
          case " ":
          case "\t":
          case "\n":
          case "\r":
            if (lastStr != "") {
              lexed.push(lastStr);
              lastStr = "";
            }
            break;
          case '"':
            lastStr += c;
            mode = Mode.QUOTED;
            break;
          default:
            lastStr += c;
            break;
        }
        break;
      case Mode.QUOTED:
        switch (c) {
          case "\\":
            mode = Mode.ESCAPED;
            break;
          case '"':
            lastStr += c;
            mode = Mode.TXT;
            break;
          default:
            lastStr += c;
            break;
        }
        break;
      case Mode.ESCAPED:
        lastStr += c; //todo escape characters
        mode = Mode.QUOTED;
        break;
    }
  }
  return lexed;
}

export class SExprHandler {
  private f: string;
  private l: string[];
  private p: SExpr;

  constructor(filename: string) {
    this.f = fs.readFileSync(filename, "utf8");
    this.l = lex(this.f);
    this.p = parse(this.l);
  }

  public find(path: string[]): SExpr[] {
    return findElement(this.p, path);
  }
}
