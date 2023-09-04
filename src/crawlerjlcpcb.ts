import axios from "axios";
import { Crawler, DistributionData, DistributionInfo } from "./crawler";
interface JlcpcbResponse {
  data: {
    componentPageInfo: {
      list: {
        canPresaleNumber: number
        componentCode: string;
        componentBrandEn: string;
        componentName: string;
        componentLibraryType: string;
        componentPrices: {
          endNumber: number;
          productPrice: number;
          startNumber: number;
        }[];
        dataManualUrl: string;
        minImage: string;
        stockCount: number;
        urlSuffix: string;
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
            extraData: [
              { property: "STOCK_JLCPCB", value: "" + compInfo.canPresaleNumber },
              { property: "ORGMC_JLCPCB", value: "" + compInfo.componentName },
              { property: "ORGMF_JLCPCB", value: "" + compInfo.componentBrandEn },
              { property: "LIBTYPE_JLCPCB", value: "" + compInfo.componentLibraryType },
              { property: "DS_LINK_JLCPCB", value: "" + compInfo.dataManualUrl },
              { property: "IMG_LINK_JLCPCB", value: "" + compInfo.minImage },
              { property: "LINK_JLCPCB", value: "https://jlcpcb.com/partdetail/" + compInfo.urlSuffix },
              { property: "CRAWL_DATE_JLCPCB", value: new Date().toDateString() },
            ]
          };
          return data;
        });
    });
  }
}
