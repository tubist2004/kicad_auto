

interface CrawlerConf {}

export interface DistributionInfo {
  id: number;
  ordercode: string;
  name: string;
}

interface ExtraData {
    property: string;
    value: string;
}

export interface DistributionData {
    prices: {
        price: number,
        mult: number,
        min: number,
        currency: string
    }[];
    info: DistributionInfo;
    extraData?: ExtraData[]; 
}

export interface Crawler {
    getUpdater(infos: DistributionInfo[]): Promise<DistributionData>[];
    readonly distributorName: string;
}
