import { FitsFileReader } from './FileReader';
import { FitsHDU, FitsData } from '../interfaces';
import { getTypeSize, parseFieldData, writeFieldData } from '../utils/TypeUtils';

interface ColumnFormat {
    count: number;
    type: string;
    size: number;
}

export function deriveColumnFormats(
    header: FitsHDU['header'],
    columns: number,
    ): ColumnFormat[] {
    const columnFormats: ColumnFormat[] = [];
    for (let i = 0; i < columns; i++) {
        const rawTForm = header.getString(`TFORM${i + 1}`)?.trim().replace(/^'(.*)'$/, '$1');
        if (!rawTForm) {
            console.error(`Missing TFORM for column ${i + 1}`);
            continue;
        }
        const match = /^(\d*)([LIJEDCU])$/.exec(rawTForm.trim());
        if (!match) {
            console.error(`Invalid TFORM for column ${i + 1}: '${rawTForm}'`);
            continue;
        }
        const count = parseInt(match[1] || '1', 10);
        const type = match[2];
        const size = count * getTypeSize(type);
        columnFormats.push({ count, type, size });
    }
    return columnFormats;
}

export class TableParser {
    constructor(private readonly fileReader: FitsFileReader) {}

    public async readTable(hdu: FitsHDU): Promise<FitsData> {
        const rows = hdu.header.get('NAXIS2') ?? 0;
        const columns = hdu.header.get('TFIELDS') ?? 0;
        const rowLength = hdu.header.get('NAXIS1') ?? 0;

        const columnFormats: ColumnFormat[] = deriveColumnFormats(hdu.header, columns);
        const colKeys: string[] = [];

        for (let i = 0; i < columns; i++) {
            let ttype = `COL_${i + 1}`; // Default column name
            let tunit = ''; // Default to empty unit
        
            if (hdu.header.has(`TTYPE${i + 1}`)) {
                const rawTType = hdu.header.getString(`TTYPE${i + 1}`)?.trim();
                if (rawTType) {
                    ttype = rawTType.replace(/\W/g, '');
                }
            }
        
            if (hdu.header.has(`TUNIT${i + 1}`)) {
                const rawTUnit = hdu.header.getString(`TUNIT${i + 1}`)?.trim();
                if (rawTUnit) {
                    tunit = rawTUnit.replace(/\W/g, '');
                }
            }
        
            colKeys.push(tunit && tunit.toLowerCase() !== 'nodim' ? `${ttype} (${tunit})` : ttype);
        }        

        const rowData: any[] = [];

        for (let row = 0; row < rows; row++) {
            const rowArray: any[] = [];
            let rowOffset = hdu.dataOffset! + row * rowLength;
            
            for (const col of columnFormats) {
                const { count, type, size } = col;
                const dataBuffer = await this.fileReader.readBytes(rowOffset, size);
                rowArray.push(parseFieldData(dataBuffer, type, count));
                rowOffset += size;
            }
        
            rowData.push(rowArray);
        }

        return { shape: [rows, columnFormats.length], data: rowData, keys: colKeys, type: 'table' };
    }
}

export class TableWriter {
    public toBinary(data: FitsData, columnFormats: ColumnFormat[]): Uint8Array {
        if (data.type !== 'table') {
            throw new Error('TableWriter can only serialize table data.');
        }

        const [rows, columns] = data.shape;
        const rowLength = columnFormats.reduce((sum, col) => sum + col.size, 0);
        const totalSize = rows * rowLength;
        const buffer = new ArrayBuffer(totalSize);

        let offset = 0;
        for (let r = 0; r < rows; r++) {
            const row = data.data[r];
            if (!Array.isArray(row)) {
                throw new Error(`Row ${r} is not an array`);
            }

            let rowOffset = offset;
            for (let c = 0; c < columns; c++) {
                const value = row[c];
                const format = columnFormats[c];

                const fieldBuffer = writeFieldData(value, format.type, format.count);
                const fieldView = new Uint8Array(fieldBuffer);

                // Copy fieldView into main buffer
                new Uint8Array(buffer, rowOffset, fieldView.length).set(fieldView);
                rowOffset += format.size;
            }

            offset += rowLength;
        }

        return new Uint8Array(buffer);
    }
}
