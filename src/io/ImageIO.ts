import { FitsFileReader } from './FileReader';
import { FitsHDU, ImageData, FitsNumericArray } from '../interfaces';

export class ImageParser {
    constructor(private readonly fileReader: FitsFileReader) {}

    public async readImage(hdu: FitsHDU): Promise<ImageData> {
        const header = hdu.header;
        const rows   = header.get('NAXIS1')!;
        const cols   = header.get('NAXIS2')!;
        const bitpix = header.get('BITPIX')!;
        const count  = rows * cols;
        
        const raw = await this.fileReader.readBytes(
            hdu.dataOffset!, count * Math.abs(bitpix) / 8
        );

        const buf = raw.buffer.slice(
            raw.byteOffset, raw.byteOffset + raw.byteLength
        );
        let data: FitsNumericArray;

        const bscale = header.get('BSCALE') ?? 1;
        const bzero  = header.get('BZERO') ?? 0;

        switch (bitpix) {
        case 8:
            data = new Uint8Array(buf);
            break;
        case 16: {
            const view = new DataView(buf);
            const arr  = new Int16Array(count);
            for (let i = 0; i < count; i++) {
            arr[i] = view.getInt16(i * 2, false) * bscale + bzero;
            }
            data = arr;
            break;
        }
        case 32: {
            const view = new DataView(buf);
            const arr  = new Int32Array(count);
            for (let i = 0; i < count; i++) {
            arr[i] = view.getInt32(i * 4, false) * bscale + bzero;
            }
            data = arr;
            break;
        }
        case -32: {
            // FITS floats are big-endian. We can DataView-read then copy, or:
            const f32 = new Float32Array(count);
            const view = new DataView(buf);
            for (let i = 0; i < count; i++) {
                f32[i] = view.getFloat32(i * 4, false);
            }
            data = f32;
            break;
        }
        case -64: {
            const f64 = new Float64Array(count);
            {
            const view = new DataView(buf);
            for (let i = 0; i < count; i++) {
                f64[i] = view.getFloat64(i * 8, false);
            }
            }
            data = f64;
            break;
        }
        default:
            throw new Error(`Unsupported BITPIX ${bitpix}`);
        }

        return {
            shape: [rows, cols],
            keys: [],
            data,
            type: 'image',
        };
    }
}

export class ImageWriter {
    public toBinary(image: ImageData, bitpix: number = 16, bscale = 1, bzero = 0): Uint8Array {
        if (image.type !== 'image') {
            throw new Error(`Data type is not 'image'`);
        }
        if (image.shape[0] * image.shape[1] !== image.data.length) {
            throw new Error(`Data length does not match shape dimensions.`);
        }

        const elementSize = Math.abs(bitpix) / 8;
        const bufferSize = image.shape[0] * image.shape[1] * elementSize;
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

        for (let i = 0; i < image.data.length; i++) {
            writer(i * elementSize, image.data[i]);
        }

        return new Uint8Array(buffer);
    }
}
