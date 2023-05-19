import * as fs from "fs";
import { isStringObject } from "util/types";
import { readFile } from "xlsx";
import { At } from "./kicadlib";

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

interface Element {
  isAtom: boolean;
}

interface Atom extends Element {
  value: string;
  isQuoted: boolean;
}

interface SExpr extends Element {
  childs: Array<Atom | SExpr>;
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
      last.childs.push({ value: l.slice(1, -1), isQuoted: true, isAtom: true });
    } else {
      last.childs.push({ value: l, isQuoted: false, isAtom: true });
    }
  });
  return stree;
}

function serializeSExp(expr: SExpr, n: number): string {
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

function findElement(sExpr: SExpr, path: string[]): SExpr[] {
  let sExprs = sExpr.childs.filter((child) => !child.isAtom) as SExpr[];
  let next = sExprs.filter(
    (child) => (child.childs[0] as Atom).value == path[0]
  );
  if (path.length == 1) return next;
  return findElement(next[0], path.slice(1));
}

function getSymbol(libPath: string, sym: string) {
  let f = fs.readFileSync(libPath, "utf8");
  let l = lex(f);
  let p = parse(l);
  let s = findElement(p, ["kicad_symbol_lib", "symbol"]);
  return (s as SExpr[]).find((e) => (e.childs[1] as Atom).value == sym);
}

function setName(symbol: SExpr, name: string) {
  (symbol.childs[1] as Atom).value = name;
  let i = 0;
  findElement(symbol, ["symbol"])?.forEach((s) => {
    (s.childs[1] as Atom).value =
      name +
      (s.childs[1] as Atom).value.substring(
        (s.childs[1] as Atom).value.length - 4
      );
    i++;
  });
}

function setOrCreateProperty(symbol: SExpr, key: string, value: string) {
  let ps = findElement(symbol, ["property"]) as SExpr[];
  let p: SExpr | undefined = ps.find((e) => (e.childs[1] as Atom).value == key);
  if (p == undefined) {
    let max =
      1 +
      Math.max(
        ...ps.map((e) =>
          Number.parseInt((findElement(e, ["id"])[0].childs[1] as Atom).value)
        )
      );
    p = {
      isAtom: false,
      childs: [
        { value: "property", isAtom: true, isQuoted: false },
        { value: key, isAtom: true, isQuoted: true },
        { value: value, isAtom: true, isQuoted: true },
        {
          childs: [
            { value: "id", isAtom: true, isQuoted: false },
            { value: max + "", isAtom: true, isQuoted: false },
          ],
          isAtom: false,
        },
        {
          childs: [
            { value: "at", isAtom: true, isQuoted: false },
            { value: "0", isAtom: true, isQuoted: false },
            { value: "0", isAtom: true, isQuoted: false },
            { value: "0", isAtom: true, isQuoted: false },
          ],
          isAtom: false,
        },
        {
          childs: [
            { value: "effects", isAtom: true, isQuoted: false },
            {
              childs: [
                { value: "font", isAtom: true, isQuoted: false },
                {
                  childs: [
                    { value: "size", isAtom: true, isQuoted: false },
                    { value: "1.27", isAtom: true, isQuoted: false },
                    { value: "1.27", isAtom: true, isQuoted: false },
                  ],
                  isAtom: false,
                },
              ],
              isAtom: false,
            },
            { value: "hide", isAtom: true, isQuoted: false },
          ],
          isAtom: false,
        },
      ],
    };
    symbol.childs.push(p);
  }
  (p.childs[1] as Atom).value = key;
  (p.childs[2] as Atom).value = value;
  return;
}

const wb = readFile(
  "/home/markus/projekte/900_library/kicad/generator_v2/parts.ods"
);
let database = wb.SheetNames.map((name) => wb.Sheets[name]).map((sheet) => {
  let objs: any = [];
  let cols = [];
  let cmax = 0;
  for (let c = "A".charCodeAt(0); c <= "Z".charCodeAt(0); c++) {
    let cell: any = sheet[String.fromCharCode(c) + "1"];
    if (cell == undefined) break;
    cmax = c;
    cols.push(cell["v"]);
  }
  for (let r = 2; r < Number.MAX_SAFE_INTEGER; r++) {
    let row: any = {};
    let i = 0;
    for (let c = "A".charCodeAt(0); c <= cmax; c++) {
      let cell = sheet[String.fromCharCode(c) + "" + r];
      if (cell != undefined) {
        row[cols[i]] = cell.v;
      } else {
        row[cols[i]] = "";
      }
      i++;
    }
    if (Object.entries(row).length == 0) break;
    if (Object.entries(row)[0][1] == "") {
      break;
    }
    objs.push(row);
  }
  return objs;
});

let libs: any = {};
database.forEach((lib) => {
  lib.forEach((part: any) => {
    let sym = getSymbol(part["SRC_LIB"], part["SRC_PART"]);
    setName(sym as SExpr, part["NAME"]);
    setOrCreateProperty(sym as SExpr, "Value", part["NAME"]);
    Object.entries(part).forEach((v, k) => {
      setOrCreateProperty(sym as SExpr, v[0], v[1] as string);
    });
    if (libs[part["TARGET_LIB"]] == undefined) {
      libs[part["TARGET_LIB"]] = {
        isAtom: false,
        childs: [
          { isAtom: true, value: "kicad_symbol_lib", isQuoted: false },
          {
            isAtom: false,
            childs: [
              { isAtom: true, value: "version", isQuoted: false },
              { isAtom: true, value: "20211014", isQuoted: false },
            ],
          },
          {
            isAtom: false,
            childs: [
              { isAtom: true, value: "generator", isQuoted: false },
              { isAtom: true, value: "lib900gen", isQuoted: false },
            ],
          },
        ],
      } as SExpr;
    }
    libs[part["TARGET_LIB"]]["childs"].push(sym);
  });
});

/*let pnp = getSymbol("/usr/share/kicad/symbols/Device.kicad_sym", "Q_PNP_BEC");
setName(pnp as SExpr, "BC847");
setOrCreateProperty(pnp as SExpr, "Reference", "H");
setOrCreateProperty(pnp as SExpr, "Hallo", "Welt");
console.log(serializeSExp(pnp as SExpr,0));*
*/

Object.entries(libs).forEach((lib) => {
  const ser = serializeSExp(lib[1] as SExpr, 0);
  fs.writeFileSync(
    "/home/markus/projekte/900_library/kicad/" + lib[0] + ".kicad_sym",
    ser
  );
});
