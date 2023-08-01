import express from "express";
import { crawlPrices } from "./updateOnline";
import { createPool } from "mysql2/promise";
import { calcRun } from "./calcrun";

let app = express();

let pool = createPool({
    //host: "localhost",
    host: "quittenweg4",
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

        app.post("/startCalcrun", (req, res) => {
            calcRun(c).then();
            res.end();
        });

        // start the Express server
        app.listen(7001, () => {
            console.log(`server started at http://localhost:${7001}`);
        });
    });

