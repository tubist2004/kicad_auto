

interface CrawlerConf {}

export interface DistributionInfo {
  id: number;
  ordercode: string;
  name: string;
}

export interface DistributionData {
    prices: {
        price: number,
        mult: number,
        min: number,
        currency: string
    }[];
    info: DistributionInfo;
}

export interface Crawler {
    getUpdater(infos: DistributionInfo[]): Promise<DistributionData>[];
    readonly distributorName: string;
}
