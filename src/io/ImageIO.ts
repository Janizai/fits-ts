import { FitsFileReader } from './FileReader';
import { FitsHDU, FitsData } from '../interfaces';

export class ImageParser {
    constructor(private readonly fileReader: FitsFileReader) {}

    public async readImage(hdu: FitsHDU): Promise<FitsData> {
        const header = hdu.header;
        const rows = header.get('NAXIS1') ?? 0;
        const columns = header.get('NAXIS2') ?? 0;

        const bitpix = header.get('BITPIX') ?? 0;

        const elementSize = Math.abs(bitpix) / 8;
        const dataSize = rows * columns * elementSize;
        
        const rawData = await this.fileReader.readBytes(hdu.dataOffset!, dataSize);
        const view = new DataView(rawData.buffer, rawData.byteOffset, rawData.byteLength);

        const bitpixParser: Record<number, (offset: number) => number> = {
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

        const bscale = header.has('BSCALE') ? header.get('BSCALE')! : 1;
        const bzero = header.has('BZERO') ? header.get('BZERO')! : 0;
        const data: number[] = [];

        for (let i = 0; i < dataSize; i += elementSize) {
            const value = parser(i);
            data.push(value * bscale + bzero);
        }

        if (data.length !== rows * columns) {
            console.warn(`Parsed data length (${data.length}) does not match expected (${rows * columns}).`);
        }

        return {
            shape: [rows, columns],
            keys: [],
            data,
            type: 'image',
        };
    }
}

export class ImageWriter {
    public toBinary(data: FitsData, bitpix: number = 16, bscale = 1, bzero = 0): Uint8Array {
        if (data.type !== 'image') {
            throw new Error(`Data type is not 'image'.`);
        }
        if (data.shape.length !== 2) {
            throw new Error(`Only 2D images are supported for writing.`);
        }
        if (data.shape[0] * data.shape[1] !== data.data.length) {
            throw new Error(`Data length does not match shape dimensions.`);
        }
        
        const elementSize = Math.abs(bitpix) / 8;
        const bufferSize = data.shape[0] * data.shape[1] * elementSize;
        const buffer = new ArrayBuffer(bufferSize);
        const view = new DataView(buffer);

        const reverseScale = (value: number): number =>
            Math.round((value - bzero) / bscale); // assuming integer values

        const writerMap: Record<number, (offset: number, value: number) => void> = {
            8: (offset, val) => view.setUint8(offset, reverseScale(val)),
            16: (offset, val) => view.setInt16(offset, reverseScale(val), false),
            32: (offset, val) => view.setInt32(offset, reverseScale(val), false),
            [-32]: (offset, val) => view.setFloat32(offset, val, false),
            [-64]: (offset, val) => view.setFloat64(offset, val, false),
        };

        const writer = writerMap[bitpix];
        if (!writer) {
            throw new Error(`Unsupported BITPIX for writing: ${bitpix}`);
        }

        for (let i = 0; i < data.data.length; i++) {
            writer(i * elementSize, data.data[i]);
        }

        return new Uint8Array(buffer);
    }
}
