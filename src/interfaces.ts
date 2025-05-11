import { FitsHeader } from './core/FitsHeader';

export type HDUType = 'image' | 'table' | 'header';

export interface FitsHDU {
    headerOffset?: number;
    dataOffset?: number;
    header: FitsHeader;
    shape: number[] | undefined;
    data?: FitsData;
    type: HDUType;
}

export type FitsNumericArray =
  | Uint8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

export interface ImageData {
    type: 'image';
    shape: [number, number];
    keys: [];
    data: FitsNumericArray;
}

export interface TableData {
    type: 'table';
    shape: [number, number];
    keys: string[];
    data: any[][];
}

export interface HeaderData {
    type: 'header';
    shape: [];
    keys: [];
    data: null;
}

export type FitsData = ImageData | TableData | HeaderData; 
