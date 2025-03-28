export interface FitsHeader {
    [key: string]: string;
  }
  
export interface HDU {
    headerOffset: number;
    dataOffset: number;
    header: FitsHeader;
    shape: number[];
}

export interface FitsData {
    shape: number[];
    keys: string[];
    data: any[];
}

export interface TForm {
    count: number;
    type: string;
    size: number;
}
