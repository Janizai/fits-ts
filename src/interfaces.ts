import { FitsHeader } from './core/FitsHeader';

export type HDUType = 'image' | 'table' | 'header';

export interface FitsHDU {
    headerOffset?: number;
    dataOffset?: number;
    header: FitsHeader;
    shape: number[];
    data?: FitsData;
    type: HDUType;
}

export interface FitsData {
    shape: number[];
    keys: string[];
    type: HDUType;
    data: any[];
}
