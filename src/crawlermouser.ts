import axios from "axios";
import { IMouserApiRequest, MouserPart, SearchResponseRoot } from "./mouserapi";
import { Crawler, DistributionData, DistributionInfo } from "./crawler";

function searchMouserPartnumber(partnumbers: string[]) {
  let request: IMouserApiRequest = {
    SearchByPartRequest: {
      mouserPartNumber: partnumbers.join(" | "),
      partSearchOptions: "EXACT",
    },
  };
  return axios.post<SearchResponseRoot>(
    "https://api.mouser.com/api/v1/search/partnumber?apiKey=db463ffa-e220-473a-a718-fc975258b6a3",
    JSON.stringify(request),
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
}

function junkify<T>(arr: T[], junksize: number) {
  let junks: (typeof arr)[] = [];
  for (let i = 0; i < arr.length; i += junksize) {
    junks.push(arr.slice(i, i + junksize));
  }
  return junks;
}

export class CrawlerMouser implements Crawler {
  distributorName: string = "MOUSER";
  static convertPartData(part: MouserPart, info: DistributionInfo) {
    let prices = part.PriceBreaks.map((pbreak) => {
      return {
        price: Number.parseFloat(
          pbreak.Price.trim().split(" ")[0].replace(",", ".")
        ),
        mult: Number.parseInt(part.Mult),
        min: pbreak.Quantity,
        currency: pbreak.Currency,
      };
    });
    let dData: DistributionData = {
      prices: prices,
      info: info,
    };
    return dData;
  }

  getUpdater(infos: DistributionInfo[]): Promise<DistributionData>[] {
    let junks = junkify(infos, 10);
    let mouserParts = junks.map((junk) => {
      return {
        parts: searchMouserPartnumber(junk.map((info) => info.ordercode)).then(
          (response) => {
            if (response.data.Errors.length > 0) {
              console.error(response.data.Errors);
            }
            return response.data.SearchResults.Parts;
          }
        ),
        infos: junk,
      };
    });
    let dDatas = mouserParts.map((partsjunks) => {
      return {
        data: partsjunks.parts.then((parts) => {
          return parts.map((part, index) => {
            return CrawlerMouser.convertPartData(part, partsjunks.infos.filter(i=>i.ordercode == part.MouserPartNumber)[0]);
          });
        }),
        infos: partsjunks.infos,
      };
    });
    let pdata = dDatas.map((dData) => {
      let resolves: ((
        value: DistributionData | PromiseLike<DistributionData>
      ) => void)[] = [];
      let started = false;
      let receivedData: DistributionData[] = [];
      let promises = dData.infos.map(
        (info, index) =>
          new Promise<DistributionData>((resolve, reject) => {
            if (receivedData.length > 0) {
              resolve(receivedData[index]);
            } else {
              resolves.push(resolve);
              if (!started) {
                dData.data.then((d) => {
                  d.forEach((e) => receivedData.push(e));
                  resolves.forEach((r, ri) => r(d[ri]));
                });
              }
            }
          })
      );
      return promises;
    });
    return pdata.flat();
  }
}
