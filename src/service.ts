import express from "express";
import { crawlPrices, isCrawling } from "./updateOnline";
import { createPool } from "mysql2/promise";
import { calcRun } from "./calcrun";
import { updateJlcData, updateKicadProject } from "./projectrepos";
import { getAllKicadLibs, getAllSymbolnames, getSymbolSvg } from "./kicadctrl";

let app = express();

const mysql_host = process.env.MYSQL_HOST ?? "quittenweg4.lan";
const mysql_user = process.env.MYSQL_USER ?? "root";
const mysql_password = process.env.MYSQL_PASSWORD ?? "root";
const mysql_database = process.env.MYSQL_DATABASE ?? "parts";
const mysql_port = process.env.MYSQL_PORT ?? "3306";

let pool = createPool({
    //host: "localhost",
    host: mysql_host,
    user: mysql_user,
    password: mysql_password,
    database: mysql_database,
    port: Number.parseInt(mysql_port),
});


pool.getConnection()
    .then(async (c) => {
        app.get("/", (req, res) => {
            res.send("Hello world!");
            res.end();
        });

        app.post("/startCrawler", (req, res) => {
            if (crawlPrices(c)) {
                res.end();
            }
            else {
                res.status(503).send('Crawler still running').end();
            }
        });

        app.get("/isCrawling", (req, res) => {
            res.send({ isCrawling: isCrawling() });
            res.end();
        });

        app.get("/kicadLibs", (req, res) => {
            getAllKicadLibs()
                .then((libs) => {
                    res.send(libs);
                    res.end();
                }).catch(() => {
                    res.status(404).end();
                });;
        });

        app.get("/kicadSymbols/:lib", (req, res) => {
            getAllSymbolnames(req.params["lib"])
                .then((symbols) => {
                    res.send(symbols);
                    res.end();
                }).catch(() => {
                    res.status(404).end();
                });
        });

        app.get("/kicadSymbolSvg/:lib/:symbol", (req, res) => {
            getSymbolSvg(req.params["lib"], req.params["symbol"])
                .then((svg) => {
                    res.sendFile(svg, () => {
                        res.end();
                    });
                }).catch(() =>
                    res.status(404).send("").end()
                );
        });

        app.post("/kicad_project/:id/update", (req, res) => {
            let id = Number.parseInt(req.params["id"]);
            if (updateKicadProject(c, id)) {
                res.end();
            }
            else {
                res.status(503).send('Kicad Updater still running').end();
            }
        });

        app.post("/kicad_project/:id/updateJlcData", (req, res) => {
            let id = Number.parseInt(req.params["id"]);
            if (updateJlcData(c, id)) {
                res.end();
            }
            else {
                res.status(503).send('Kicad Updater still running').end();
            }
        });

        app.post("/calculation/:id/startCalcrun", (req, res) => {
            let id = Number.parseInt(req.params["id"]);
            calcRun(c, id).then();
            res.end();
        });

        // start the Express server
        app.listen(7001, () => {
            console.log(`server started at http://localhost:${7001}`);
        });
    });

