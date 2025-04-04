export type HeaderEntryValue = string | number | boolean;

export type KnownFitsKeys =
    | 'SIMPLE' | 'BITPIX' | 'NAXIS' | 'NAXIS1' | 'NAXIS2' | 'TFIELDS' | 'EXTEND'
    | 'BSCALE' | 'BZERO'
    | `TFORM${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`
    | `TTYPE${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`
    | `TUNIT${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`;

export type FitsHeaderTypes = {
    [K in KnownFitsKeys]: 
        K extends `TFORM${number}` ? string :
        K extends `TTYPE${number}` ? string :
        K extends 'SIMPLE' | 'EXTEND' ? boolean :
        K extends 'BITPIX' | 'NAXIS' | 'NAXIS1' | 'NAXIS2' | 'TFIELDS' ? number :
        K extends 'BSCALE' | 'BZERO' ? number :
        string | number | boolean;
};
