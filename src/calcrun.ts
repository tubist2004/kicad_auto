import { readFile } from "fs/promises";
import { PoolConnection, RowDataPacket, createPool } from "mysql2/promise";
import {
  calculationrunitemEntity,
  distributionEntity,
  partlistitemEntity,
  priceEntity,
} from "./database";

function sum(arr: number[]) {
  return arr.reduce((partialSum, a) => partialSum + a, 0);
}

export async function calcRun(c: PoolConnection) {
  let query = await readFile(__dirname + "/calc.sql");
  c.query<
    (RowDataPacket &
      partlistitemEntity &
      priceEntity &
      distributionEntity &
      calculationrunitemEntity)[]
  >(query.toString(), [1])
    .then((calculations) => {
      return calculations[0];
    })
    .then(async (d) => {
      let rows = d.map((e) => {
        return { ...e, calculationrun_id: 1, calculationrunitemtype_id: 1 };
      });
      let distsums = rows
        .reduce((prev, curr) => {
          return prev.filter((pr) => pr.distributor_id == curr.distributor_id)
            .length > 0
            ? prev
            : prev.concat(curr);
        }, [] as (RowDataPacket & partlistitemEntity & priceEntity & distributionEntity & calculationrunitemEntity)[])
        .map((dist) => {
          dist = { ...dist };
          dist.price = null;
          dist.count = null;
          dist.ordercode = null;
          dist.part_id = null;
          dist.text = "SUM";
          dist.rank = 1000 + (dist.distributor_id as number);
          dist.calculationrunitemtype_id = 2;
          dist.sum =
            Math.round((
              sum(
                rows
                  .filter((row) => row.distributor_id == dist.distributor_id)
                  .map((row) => Number.parseFloat(row.sum as unknown as string))) 
              ) * 1e6
            ) / 1e6;
          return dist;
        });
      let totalsum = sum(d.map((e) => Number.parseFloat(e.sum as unknown as string)));
      let dist = {
        ...rows[0],
      };
      dist.price = null;
      dist.count = null;
      dist.ordercode = null;
      dist.part_id = null;
      dist.distributor_id = null;
      dist.text = "TOTAL";
      dist.rank = 2000;
      dist.sum = totalsum;
      dist.calculationrunitemtype_id = 3;
      rows = rows.concat(distsums as any);
      rows = rows.concat(dist);
      console.log(rows);
      await c.query("DELETE FROM `calculationrunitem`;");
      rows.forEach(async (e) => {
        await c.query("INSERT INTO `calculationrunitem` SET ?;", e);
      });
      return rows;
    })
};
