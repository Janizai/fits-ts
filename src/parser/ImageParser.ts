import { HDU, FitsData } from '../interfaces';
import { FitsFileReader } from '../io/FileReader';

export class ImageParser {
    constructor(private readonly fileReader: FitsFileReader) {}

    public async readImage(hdu: HDU): Promise<FitsData> {
        const rows = hdu.shape[0] || 0;
        const columns = hdu.shape[1] || 0;

        const bitpix = parseInt(hdu.header['BITPIX'] || '0', 10);
        const bscale = parseFloat(hdu.header['BSCALE'] || '1');
        const bzero = parseFloat(hdu.header['BZERO'] || '0');
        const elementSize = Math.abs(bitpix) / 8;
        const dataSize = rows * columns * elementSize;
        const rawData = await this.fileReader.readBytes(hdu.dataOffset, dataSize);
        const data: number[] = [];
        const view = new DataView(rawData);

        const bitpixParser: { [key: number]: (offset: number) => number } = {
            8: (offset: number) => view.getUint8(offset),
            16: (offset: number) => view.getInt16(offset, false),
            32: (offset: number) => view.getInt32(offset, false),
            [-32]: (offset: number) => view.getFloat32(offset, false),
            [-64]: (offset: number) => view.getFloat64(offset, false)
        };

        const parser = bitpixParser[bitpix];
        if (!parser) {
            throw new Error(`Unsupported BITPIX value: ${bitpix}`);
        }

        for (let i = 0; i < dataSize; i += elementSize) {
            const value = parser(i);
            data.push(value * bscale + bzero);
        }

        if (data.length !== rows * columns) {
            console.warn(`Parsed data length (${data.length}) does not match expected (${rows * columns}).`);
        }

        return { shape: hdu.shape, data, keys: [] };
    }
}
