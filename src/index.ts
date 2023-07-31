import { LibMngr } from "./libmngr";
//import { readOdsLib } from "./odslibreader";
import { loadTables } from "./sqllibreader";
/*
let parts = readOdsLib(
  "/home/markus/projekte/900_library/kicad/generator_v2/parts.ods"
);
*/
loadTables({
  //host: "localhost",
  host: "quittenweg4",
  user: "root",
  password: "root",
  database: "parts",
  port: 3306
}).then((sqlparts) => {
  let lMngr = new LibMngr();
  sqlparts.forEach((part) => lMngr.addPart(part));
  console.log(sqlparts);
  lMngr.writeToFiles("/home/markus/projekte/900_library/kicad/");
  process.exit();
});
