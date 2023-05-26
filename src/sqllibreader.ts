import {
  Connection,
  ConnectionOptions,
  RowDataPacket,
  createConnection,
} from "mysql2/promise";

interface RawPart extends RowDataPacket {
  id: number;
  name: string;
  partclass: number;
}

interface Partclass extends RowDataPacket {
  id: number;
  name: string;
}

interface Part {
  ID: number;
  NAME: string;
  PARTCLASS: number;
  TARGET_LIB: string;
  SRC_LIB: string;
  SRC_PART: string;
  Footprint: string;
  kicadlibid: string;
}

interface Kicadinfo extends RowDataPacket {
  target_lib: string;
  src_lib: string;
  src_part: string;
  footprint: string;
  id: number;
}

async function getPartclasses(c: Connection) {
  return (await c.query<Partclass[]>("SELECT * from `partclass`;"))[0];
}

async function addKicadParams(c: Connection, part: Part) {
  let result = await c.query<Kicadinfo[]>(
    "SELECT DISTINCT * FROM `kicad` WHERE `partid` = " + part.ID + ";"
  );
  let row = result[0];
  part.TARGET_LIB = row[0].target_lib;
  part.SRC_LIB = row[0].src_lib;
  part.SRC_PART = row[0].src_part;
  part.Footprint = row[0].footprint;
  part.kicadlibid = "" + row[0].id;
  return part;
}

async function fillPart(
  c: Connection,
  partclasses: { id: number; name: string }[] | any[],
  rawPart: RawPart
) {
  let part = {
    ID: rawPart.id,
    NAME: rawPart.name,
  };
  let myPartclass = partclasses.filter(
    (cl: any) => cl.id == rawPart.partclass
  )[0];
  for (let i = 0; i < 16; i++) {
    let name = "prop" + ("0" + (i + 1)).slice(-2);
    if (myPartclass[name] != "") {
      (part as any)[myPartclass[name]] = rawPart[name];
    }
  }
  return part;
}

export async function loadTables(options: ConnectionOptions) {
  let c = await createConnection(options);
  let partclasses = await getPartclasses(c);
  let rawParts: RawPart[] = [];
  await c.query<RawPart[]>("SELECT * from `part`;").then((rows) => {
    rawParts = rows[0];
  });
  let parts = await Promise.all(
    rawParts.map(async (rawPart): Promise<any> => {
      let filledPart = (await fillPart(c, partclasses, rawPart)) as Part;
      let kicadPart = await addKicadParams(c, filledPart);
      return kicadPart;
    })
  );
  return parts;
}
