import express from "express";
import { crawlPrices } from "./updateOnline";
import { createPool } from "mysql2/promise";

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
            crawlPrices(c);
            res.end();
        });

        // start the Express server
        app.listen(7001, () => {
            console.log(`server started at http://localhost:${7001}`);
        });
    });

