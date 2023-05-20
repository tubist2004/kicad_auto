import { createLib, getSymbol, setName, setOrCreateProperty } from "./kicadlib";
import { SExpr, serializeSExp } from "./sexpr";
import * as fs from "fs";

export interface DbPart {
  NAME: string;
  SRC_LIB: string;
  SRC_PART: string;
  TARGET_LIB: string;
}

export class LibMngr {
  private libs: any = {};

  addPart(p: DbPart) {
    let sym = getSymbol(p.SRC_LIB, p.SRC_PART);
    setName(sym, p.NAME);
    setOrCreateProperty(sym, "Value", p.NAME);
    Object.entries(p).forEach((v, k) => {
      setOrCreateProperty(sym, v[0], v[1] as string);
    });
    if (this.libs[p.TARGET_LIB] == undefined) {
      this.libs[p.TARGET_LIB] = createLib();
    }
    this.libs[p.TARGET_LIB]["childs"].push(sym);
  }

  writeToFiles(path: string) {
    Object.entries(this.libs).forEach((lib) => {
      const ser = serializeSExp(lib[1] as SExpr, 0);
      console.log(ser);
      //fs.writeFileSync(
      //  path + lib[0] + ".kicad_sym",
      //  ser
      //);
    });
  }
}
