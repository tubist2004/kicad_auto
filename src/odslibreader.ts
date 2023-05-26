import { readFile } from "xlsx";
import { DbPart } from "./libmngr";

export function readOdsLib(path: string) {
  const wb = readFile(path);

  let database = wb.SheetNames.map((name) => wb.Sheets[name]).map((sheet) => {
    let objs: DbPart[] = [];
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
      objs.push(row as DbPart);
    }
    return objs;
  });
  return ([] as DbPart[]).concat(...database);
}
