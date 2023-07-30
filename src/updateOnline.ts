import { Pool } from "mysql2/promise";
import { createPool } from "mysql2/promise";
import { CrawlerMouser } from "./crawlermouser";
import { DistributionData } from "./crawler";
import { CrawlerJlcplc } from "./crawlerjlcpcb";

let crawlers = [new CrawlerMouser(), new CrawlerJlcplc()];

function addToDatabase(c: Pool, part: DistributionData) {
  let query =
    "DELETE FROM `price` WHERE `distribution_id` = " + part.info.id + " ;";
  return c.query(query).then((result) => {
    part.prices.forEach((price) => {
      query =
        "INSERT INTO `price` (`distribution_id`, `value`, `min`, `mult`, `currency`) VALUES ( " +
        part.info.id +
        " ," +
        price.price +
        "," +
        price.min +
        "," +
        price.mult +
        ", (SELECT id FROM currency WHERE name = '" +
        price.currency +
        "'));";
      return c.query(query);
    });
  });
}
let i = 0;
let d = 0;

let pool = createPool({
  //host: "localhost",
  host: "quittenweg4",
  user: "root",
  password: "root",
  database: "parts",
  port: 3306,
});
  pool.getConnection()
  .then((c) => {
    return c
      .query(
        "SELECT `distribution`.*, `distributor`.`name` from `distribution` JOIN `distributor` ON `distribution`.`distributor_id` = `distributor`.`id`;"
      )
      .then((q) => {
        let rows = q[0] as { id: number; ordercode: string; name: string }[];
        let concat = crawlers
          .map((crawler) =>
            crawler.getUpdater(
              rows.filter((row) => row.name == crawler.distributorName)
            )
          )
          .flat();
        concat.forEach((data$) => {
          data$.then((data) => {
            console.log(
              "Downloaded " +
                data.info.ordercode +
                " (" +
                ++d +
                "/" +
                concat.length +
                ")"
            );
            addToDatabase(pool, data).then((k) =>
              console.log(
                "Added " +
                  data.info.ordercode +
                  " (" +
                  ++i +
                  "/" +
                  concat.length +
                  ")"
              )
            );
          });
        });
      });
  });
