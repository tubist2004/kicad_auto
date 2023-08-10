import { readdir, readFile } from "fs/promises";
import { exec } from "node:child_process";


function getLibsFromFolder(src: string, prefix: string) {
    return readdir(src)
        .then(dirs =>
            dirs
                .filter(dir => dir.endsWith(".kicad_sym"))
                .map(dir => {
                    return {
                        name: prefix + dir.replace(".kicad_sym", ""),
                        path: src + "/" + dir
                    }
                })
        )
}

export async function getAllKicadLibs() {
    let templates = await getLibsFromFolder("./template", "📕 ")
    templates.push(... await getLibsFromFolder("/usr/share/kicad/symbols", "🌍 "));
    return templates;
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

export function getAllSymbolnames(lib: string) {
    let svglist = [] as string[];
    return execP("kicad-cli sym export svg " + lib, {})
        .then(svgs => {
            svglist = svgs.split("\n").map(line => line.split("'")[1]);
            console.log(svglist);
        })
        .then(() => {
            return execP("rm *.svg", {});
        }).then((s) => {
            return svglist;
        });
}

export function getSymbolSvg(lib: string, symbol: string) {
    const cmd = "kicad-cli sym export svg -o tmp -s \"" + symbol + "\" " + lib;
    return execP(cmd, {})
        .then((s) => {
            let path = process.cwd() + "/" + s.split("'")[3];
            console.log(path);
            return path;
        });
}