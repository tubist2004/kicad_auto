import axios from "axios";
import { Crawler, DistributionData, DistributionInfo } from "./crawler";
interface JlcpcbResponse {
  data: {
    componentPageInfo: {
      list: {
        componentCode: string;
        componentPrices: {
          endNumber: number;
          productPrice: number;
          startNumber: number;
        }[];
        stockCount: number;
      }[];
    };
  };
}

export class CrawlerJlcplc implements Crawler {
  distributorName: string = "JLCPCB";
  getUpdater(infos: DistributionInfo[]): Promise<DistributionData>[] {
    return infos.map((info) => {
      return axios
        .post<JlcpcbResponse>(
          "https://jlcpcb.com/api/overseas-pcb-order/v1/shoppingCart/smtGood/selectSmtComponentList",
          {
            currentPage: 1,
            pageSize: 25,
            keyword: info.ordercode,
            componentLibraryType: null,
            stockFlag: false,
            stockSort: null,
            firstSortName: null,
            secondSortName: null,
            componentBrandList: [],
            componentSpecificationList: [],
            componentAttributeList: [],
            paramList: [],
            startStockNumber: null,
            endStockNumber: null,
            searchSource: "search",
          }
        )
        .then((resp) => {
          let componentInfos = resp.data.data.componentPageInfo.list.filter(infoPage => infoPage.componentCode == info.ordercode);
          if (componentInfos.length == 0) 
          console.error("Part not found " + info.ordercode);
          let compInfo = componentInfos[0]; 
          let data: DistributionData = {
            prices: compInfo.componentPrices.map((prices) => {
              return {
                price: prices.productPrice,
                mult: 1,
                min: prices.startNumber,
                currency: "USD",
              };
            }),
            info: info,
          };
          return data;
        });
    });
  }
}
