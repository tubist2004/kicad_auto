export interface IMouserApiRequest {
  SearchByPartRequest: {
    mouserPartNumber: string;
    partSearchOptions: string;
  };
}

interface ProductAttribute {
  AttributeName: string;
  AttributeValue: string;
}
interface Pricebreak {
  Quantity: number;
  Price: string;
  Currency: string;
}

interface AlternatePackaging {
  APMfrPN: string;
}

interface UnitWeightKg {
  UnitWeight: number;
}
interface StandardCost {
  Standardcost: number;
}

interface AvailabilityOnOrderObject {
  Quantity: number;
  Date: string;
}

interface ProductCompliance {
  ComplianceName: string;
  ComplianceValue: string;
}

export interface MouserPart {
  Availability: string;
  DataSheetUrl: string;
  Description: string;
  FactoryStock: string;
  ImagePath: string;
  Category: string;
  LeadTime: string;
  LifecycleStatus: string;
  Manufacturer: string;
  ManufacturerPartNumber: string;
  Min: string;
  Mult: string;
  MouserPartNumber: string;
  ProductAttributes: ProductAttribute[];
  PriceBreaks: Pricebreak[];
  AlternatePackagings: AlternatePackaging[];
  ProductDetailUrl: string;
  Reeling: boolean;
  ROHSStatus: string;
  SuggestedReplacement: string;
  MultiSimBlue: number;
  UnitWeightKg: UnitWeightKg;
  StandardCost: StandardCost;
  IsDiscontinued: string;
  RTM: string;
  MouserProductCategory: string;
  IPCCode: string;
  SField: string;
  VNum: string;
  ActualMfrName: string;
  AvailableOnOrder: string;
  AvailabilityInStock: string;
  AvailabilityOnOrder: AvailabilityOnOrderObject;
  InfoMessages: string[];
  SalesMaximumOrderQty: string;
  RestrictionMessage: string;
  PID: string;
  ProductCompliance: ProductCompliance[];
}

interface SearchResponse {
  NumberOfResult: number;
  Parts: MouserPart[];
}

export interface SearchResponseRoot {
  Errors: [];
  SearchResults: SearchResponse;
}
