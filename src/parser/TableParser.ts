import { HDU, FitsData, TForm } from '../interfaces';
import { FitsFileReader } from '../io/FileReader';
import { getTypeSize, parseFieldData } from '../utils/TypeUtils';

export class TableParser {
    constructor(private readonly fileReader: FitsFileReader) {}

    public async readTable(hdu: HDU): Promise<FitsData> {
        const rows = parseInt(hdu.header['NAXIS2'] || '0', 10);
        const columns = parseInt(hdu.header['TFIELDS'] || '0', 10);
        const rowLength = parseInt(hdu.header['NAXIS1'] || '0', 10);

        const colFormats: TForm[] = [];
        const colKeys: string[] = [];
        let currentOffset = 0;

        for (let i = 0; i < columns; i++) {
            const rawTType = hdu.header[`TTYPE${i + 1}`]?.trim() || `COL_${i + 1}`;
            const rawTForm = hdu.header[`TFORM${i + 1}`]?.trim();
            const rawTUnit = hdu.header[`TUNIT${i + 1}`]?.trim();

            if (!rawTForm) {
                console.error(`Missing TFORM for column ${rawTType}`);
                continue;
            }

            const ttype = rawTType.replace(/\W/g, '').trim();
            const tform = rawTForm.replace(/[^0-9LIJEDCU]/g, '').trim();
            const tunit = rawTUnit?.replace(/\W/g, '').trim();

            const match = /^(\d*)([LIJEDCU])$/.exec(tform);
            if (!match) {
                console.error(`Invalid TFORM for column '${ttype}': '${tform}'`);
                continue;
            }
            const count = parseInt(match[1] || '1', 10);
            const type = match[2];
            const size = count * getTypeSize(type);

            colKeys.push(tunit && tunit !== 'nodim' ? `${ttype} (${tunit})` : ttype);
            colFormats.push({ count, type, size });
            currentOffset += size;
        }

        if (currentOffset !== rowLength) {
            console.warn(`Mismatch between computed row length (${currentOffset}) and NAXIS1 (${rowLength}).`);
        }

        const rowData: any[] = [];
        
        for (let row = 0; row < rows; row++) {
            const rowArray: any[] = [];
            let rowOffset = hdu.dataOffset + row * rowLength;
            
            for (const col in colFormats) {
                const { count, type, size } = colFormats[col];
                const dataBuffer = await this.fileReader.readBytes(rowOffset, size);
                rowArray.push(parseFieldData(dataBuffer, type, count));
                rowOffset += size;
            }
        
            rowData.push(rowArray);
        }

        return { shape: [rows, colFormats.length], data: rowData, keys: colKeys };
    }
}
