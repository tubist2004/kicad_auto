import { parseStringPromise } from "xml2js";
import { readFile } from "fs/promises";
import { ResultSetHeader, createPool } from "mysql2/promise";

//Code Aufräumaktion

const file =
  "//home/markus/projekte/016_homeautomation/LevelSensorUs/111_ECAD/SensorBoard/SensorBoard.xml";
const name = "LevelSensorUs";

interface XmlComponent {
  $: { ref: string };
  property: XmlComponentProperty[];
  value: string;
}
interface XmlComponentProperty {
  $: {
    name: string;
    value: string;
  };
}

function getId(properties: XmlComponentProperty[]) {
  let idProperties = properties.filter((prop) => prop.$.name == "ID");
  if (idProperties.length != 1) {
    return null;
  } else {
    return idProperties[0].$.value;
  }
}

var groupBy = function (xs: any[], key: string | number) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

function extractXml(components: XmlComponent[]) {
  return components.map((component) => {
    return {
      ref: component.$.ref,
      id: getId(component.property),
      value: component.value[0],
    };
  });
}

function aggregate(
  components: {
    ref: string;
    id: string | null;
    value: string;
  }[]
) {
  let list = groupBy(components, "id");
  let undef = groupBy(list.null, "value");
  delete list.null;
  list = Object.keys(list).map((key) => {
    return { part_id: Number.parseInt(key), count: list[key].length, value: list[key][0].value };
  });
  undef = Object.keys(undef).map((key) => {
    return { part_id: null, count: undef[key].length, value: key };
  });
  list = list.concat(undef);
  list = list.map((value: any, key: number) => {
    return { rank: key * 10 + 10, ...value };
  });
  return list as {
    part_id: number | null;
    rank: number;
    count: number;
    value: string;
  }[];
}

readFile(file)
  .then((file) => parseStringPromise(file))
  .then((parsed) => parsed.export.components[0].comp)
  .then(extractXml)
  .then(aggregate)
  .then((data) => {
    return createPool({
      //host: "localhost",
      host: "quittenweg4",
      user: "root",
      password: "root",
      database: "parts",
      port: 3306,
    })
      .getConnection()
      .then((c) => {
        return c
          .query(
            "INSERT INTO partlist (`name`,`sourcefile`,`date`) VALUES ('" +
              name +
              "', '" +
              file +
              "', NOW() );"
          )
          .then((header) => {
            let newId = (header[0] as ResultSetHeader).insertId;
            return Promise.all(
              data.map((part) => {
                return c.query(
                  "INSERT INTO partlistitem (`part_id`,`partlist_id`,`count`, `rank`, `value`) VALUES (?, ?, ?, ?, ?)",
                  [part.part_id, newId, part.count, part.rank, part.value]
                );
              })
            );
          });
      });
  })
  .then((retval) => console.log(retval));
