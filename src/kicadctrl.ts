import { readdir } from "fs/promises";

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
