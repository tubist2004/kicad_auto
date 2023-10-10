import { exec } from "node:child_process";
import { parseStringPromise } from "xml2js";
import { readFile, writeFile } from "fs/promises";
import { ResultSetHeader, PoolConnection, RowDataPacket } from "mysql2/promise";
import { v4, v5, version } from "uuid";
import { calculationrunEntity, calculationrunitemEntity, kicad_projectsEntity } from "./database";

//const GITREPO = "git@github.com:tubist2004/LevelSensorUs";
//const PROJECTNAME = "LevelSensorUs"
//const PROJECTPATH = "111_ECAD/SensorBoard";
//const DESIGNNAME = "SensorBoard";
const DISTRIBUTOR_ID_JLCPCB = 2;

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

interface JlcPnPEntry {
    'Designator': string,
    'Mid X': string,
    'Mid Y': string,
    'Layer': string,
    'Rotation': string
}
interface JlcBomEntry {
    'Comment': string,
    'Designator': string,
    'Footprint': string,
    'JLCPCB Part #（optional）': string,
}

function getPropertyByName(properties: XmlComponentProperty[], name: string) {
    let idProperties = properties.filter((prop) => prop.$.name == "ID");
    if (idProperties.length != 1) {
        return null;
    } else {
        return idProperties[0].$.value;
    }
}

function getId(properties: XmlComponentProperty[]) {
    return getPropertyByName(properties, "ID");
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

function execP(
    command: string,
    options: { cwd?: string }) {
    let p = new Promise<string>((resolve, reject) => {
        exec(command, options, (error, stdout: string, stderr: string) => {
            if (error) {
                reject({ error, stderr });
            }
            else {
                resolve(stdout)
            }
        })
    });
    return p;
};

let isUpdating = false;
export function isRunning() {
    return isUpdating;
}

export function createJlcData(components: XmlComponent[]) {

}

interface KicadPnPFileLine {
    ref: string;
    val: string;
    Package: string;
    PosX: string;
    PosY: string;
    Rot: string;
    Side: string;
}

function gatherJlcData(c: PoolConnection, id: number) {
    let filename = "tmp/" + v4();
    let lines: KicadPnPFileLine[];
    let cItems: calculationrunitemEntity[];
    return updateFromGit(c, id).then((o) => {
        if (o) console.log(o);
        let cli = "kicad-cli pcb export pos "
            + `tmp/${o.name}/${o.path}/${o.designname}.kicad_pcb `
            + "-o " + filename;
        console.log(cli);
        return execP(cli, {});
    }).catch(e => {
        console.error("Can't create BOM: " + e);
        return false;
    }).then(o => {
        console.log(o);
        return readFile(filename);
    }).then((file) => {
        lines = file.toString()
            .split("\n")
            .filter(line => !line.startsWith("##"))
            .map(line => line
                .split("  ")
                .map(element => element.trim())
                .filter(element => element != '')
            )
            .map(element => ({
                ref: element[0],
                val: element[1],
                Package: element[2],
                PosX: element[3],
                PosY: element[4],
                Rot: element[5],
                Side: element[6],
            }));
        return c.query(
            "SELECT * FROM calculationrunitem WHERE ? AND ? AND ?",
            [{
                calculationrun_id: 1, //TODO
            },
            {
                distributor_id: DISTRIBUTOR_ID_JLCPCB
            },
            {
                calculationrunitemtype_id: 1
            }]
        )
    }).then((resp) => {
        cItems = resp[0] as calculationrunitemEntity[];
        console.log(cItems);
        let relPairs = cItems.map(cItem => ({
            cItem: cItem, lines: lines
                .filter(line => line.val == cItem.text), version: version
        }));
        return relPairs;
    });
}

function toCsv(items: any[], name: string) {
    let csv = [Object
        .keys(items[0])]
        .concat(items.map(item => Object.values(item)
            .map((value: any) => value.toString() as string)
            .map(value => "\"" + value + "\"")))
        .map(items => items.join(",")).join("\n");
    writeFile("tmp/" + name, csv).then(() => { });
    return csv;
}

export function updateJlcData(c: PoolConnection, id: number) {
    if (isUpdating) return false;
    isUpdating = true;
    gatherJlcData(c, id).then(relPairs => {
        let BomItems = relPairs.map(relPair => {
            let designators =
                relPair.lines.map(line => line.ref)
                    .join(",");
            return {
                'Comment': relPair.cItem.text,
                'Designator': designators,
                'Footprint': relPair.lines[0].Package,
                'JLCPCB Part #（optional）': relPair.cItem.ordercode,
            };
        });
        let PnpItems = relPairs.map(pair => {
            return pair.lines.map(line => {
                let rot = Number.parseFloat(line.Rot);
                if (rot < 0) {
                    rot = rot + 360;
                }
                let e: JlcPnPEntry = {
                    Designator: line.ref,
                    "Mid X": (Number.parseFloat(line.PosX) * 25.4).toFixed(4) + "mm",
                    "Mid Y": (Number.parseFloat(line.PosY) * 25.4).toFixed(4) + "mm",
                    Layer: line.Side == "bottom" ? "B" : "T",
                    Rotation: rot.toFixed(0),
                };
                return e;
            }).flat();
        }).flat();
        console.log(toCsv(BomItems, "bom.csv"));
        console.log(toCsv(PnpItems, "pnp.csv"));
        isUpdating = false;
    });
    return true;
}

//returns the versicn
async function updateFromGit(c: PoolConnection, id: number) {
    let pInfo = await getKicadProjectInfo(c, id);
    let cli = "git clone " + pInfo.gitrepo;
    console.log(cli);
    let version = "none";
    return execP(cli,
        { cwd: "tmp" }
    ).then(o => {
        console.log(o);
    }).catch((reason) => {
        console.log(reason.stderr);
        let cli = "git pull";
        console.log(cli);
        return execP(cli,
            { cwd: "tmp/" + pInfo.name }
        );
    }).then(async o => {
        if (o) console.log(o);
        let cli = "git log --pretty=format:'%h' -n 1";
        return {
            version: await execP(cli,
                {
                    cwd: "tmp/" + pInfo.name
                }
            ),
            ...pInfo
        };
    });
}

export async function getKicadProjectInfo(c: PoolConnection, id: number): Promise<kicad_projectsEntity> {
    return c.query("SELECT DISTINCT * FROM `kicad_projects` WHERE ?",
        { id: id }
    ).then(p => {
        return (p as RowDataPacket)[0][0] as kicad_projectsEntity;
    });
}

export function updateKicadProject(c: PoolConnection, id: number) {
    if (isUpdating) return false;
    isUpdating = true;
    let version = "none";
    let info: kicad_projectsEntity = {};
    updateFromGit(c, id)
        .then((o) => {
            if (o) console.log(o);
            version = o.version;
            let cli = "kicad-cli sch export python-bom "
                + `tmp/${o.name}/${o.path}/${o.designname}.kicad_sch `
                + "-o BOM.xml";
            console.log(cli);
            return execP(cli, {});
        }).catch(e => {
            console.error("Can't create BOM");
        }).then(o => {
            console.log(o);
            return readFile("BOM.xml");
        }).then((file) =>
            parseStringPromise(file)
        ).then((parsed) =>
            parsed.export.components[0].comp
        ).then(
            extractXml
        ).then(
            aggregate
        ).then((data) => c
            .query(
                "INSERT INTO partlist (`name`,`sourcefile`,`date`, `version`) VALUES ('" +
                info.name + "/" + info.designname +
                "', '" +
                info.designname + ".kicad_sch" +
                "', NOW()" +
                ", '" +
                version +
                "');"
            )
            .then((header) => {
                let newId = (header[0] as ResultSetHeader).insertId;
                return Promise.all(
                    data.map((part) => c.query(
                        "INSERT INTO partlistitem (`part_id`,`partlist_id`,`count`, `rank`, `value`) VALUES (?, ?, ?, ?, ?)",
                        [part.part_id, newId, part.count, part.rank, part.value]
                    ))
                );
            })
        ).then((retval) => {
            isUpdating = false;
            console.log(retval);
        });
    return true;
}
