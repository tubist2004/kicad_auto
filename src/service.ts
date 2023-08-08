import express from "express";
import { crawlPrices, isCrawling } from "./updateOnline";
import { createPool } from "mysql2/promise";
import { calcRun } from "./calcrun";
import { updateKicadProject } from "./projectrepos";

let app = express();

let pool = createPool({
    //host: "localhost",
    host: "mariadb",
    user: "root",
    password: "root",
    database: "parts",
    port: 3306,
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
            res.send({isCrawling: isCrawling()});
            res.end();
        });

        app.post("/updateKicadProject", (req, res) => {
            if (updateKicadProject(c)) {
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

