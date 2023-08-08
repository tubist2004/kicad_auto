import { exec } from "node:child_process";
import { parseStringPromise } from "xml2js";
import { readFile } from "fs/promises";
import { ResultSetHeader, createPool, PoolConnection } from "mysql2/promise";

const GITREPO = "https://github.com/tubist2004/LevelSensorUs";
const PROJECTNAME = "LevelSensorUs"
const PROJECTPATH = "111_ECAD/SensorBoard";
const DESIGNNAME = "SensorBoard"

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
export function updateKicadProject(c: PoolConnection) {
    if (isUpdating) return false;
    isUpdating = true;
    let cli = "git clone " + GITREPO;
    console.log(cli);
    let version = "none";
    execP(cli,
        { cwd: "test" }
    ).then(o => {
        console.log(o);
    }).catch((reason) => {
        console.log(reason.stderr);
        let cli = "git pull ";
        console.log(cli);
        return execP(cli,
            { cwd: "test/" + PROJECTNAME }
        );
    }).then(o=> {
        if (o) console.log(o);
        let cli = "git log --pretty=format:'%h' -n 1";
        return execP(cli,
            { cwd: "test/" + PROJECTNAME }
        );
    }).then((o) => {
        if (o) console.log(o);
        version = o;
        let cli = "kicad-cli sch export python-bom "
            + `test/${PROJECTNAME}/${PROJECTPATH}/${DESIGNNAME}.kicad_sch `
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
            PROJECTNAME + "/" + DESIGNNAME +
            "', '" +
            DESIGNNAME + ".kicad_sch" +
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
