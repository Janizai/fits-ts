import { FitsHeader } from './core/FitsHeader';

type HDUType = 'image' | 'table';

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
