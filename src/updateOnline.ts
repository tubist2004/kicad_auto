import { Pool, PoolConnection } from "mysql2/promise";
import { createPool } from "mysql2/promise";
import { CrawlerMouser } from "./crawlermouser";
import { Crawler, DistributionData } from "./crawler";
import { CrawlerJlcplc } from "./crawlerjlcpcb";

let crawlers = [new CrawlerMouser(), new CrawlerJlcplc()];

//remove old price data from database and put in the new one
async function addToDatabase(c: Pool, part: DistributionData) {
  let query = "DELETE FROM `price` WHERE ? ;";
  await c.query(query, { distribution_id: part.info.id });
  let queries = part.prices.map((price) => {
    query = "INSERT INTO `price` (`distribution_id`, `value`, `min`, `mult`, `currency`) "
      + "VALUES (?, ?, ?, ?, (SELECT id FROM currency WHERE name = ?) );";
    return c.query(query, [part.info.id, price.price, price.min, price.mult, price.currency]);
  });
  await Promise.all(queries);
}


let pool = createPool({
  //host: "localhost",
  host: "quittenweg4",
  user: "root",
  password: "root",
  database: "parts",
  port: 3306,
});

function startCrawler(crawler: Crawler, allrows: { id: number; ordercode: string; name: string }[]) {
  return crawler.getUpdater(
    allrows.filter((row) => row.name == crawler.distributorName)
  )
}

function processResult(data$: Promise<DistributionData>, l: number, counter: IntCounter) {
  return data$.then((data) => {
    console.log(`Downloaded ${data.info.ordercode} (${++counter.d}/${l})`);
    return addToDatabase(pool, data).then((k) =>
      console.log(`Added ${data.info.ordercode} (${++counter.i}/${l})`)
    );
  });
}

class IntCounter {
  i = 0;
  d = 0;
}

let isRunning = false;

async function doCrawling(pool: PoolConnection){
  isRunning = true
  let counter = new IntCounter();
  let q = await pool.query(
    "SELECT `distribution`.*, `distributor`.`name` from `distribution` " +
    "JOIN `distributor` ON `distribution`.`distributor_id` = `distributor`.`id`;"
  );
  let rows = q[0] as { id: number; ordercode: string; name: string }[];
  let concat = crawlers
    .map((crawler) => startCrawler(crawler, rows))
    .flat();
  await Promise.all(concat.map((data$) => processResult(data$, concat.length, counter)));
  isRunning = false;
}

export function crawlPrices(pool: PoolConnection) {
  if (isRunning) return false;
  isRunning = true;
  doCrawling(pool).then();
  return true;
}
