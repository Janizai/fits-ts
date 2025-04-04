import pako from 'pako';

export type FitsFileSource = Buffer | ArrayBuffer | Uint8Array;

export class FitsFileReader {
    private readonly data: Uint8Array;

    constructor(source: FitsFileSource) {
        this.data = FitsFileReader.normalize(source);
    }

    private static normalize(source: FitsFileSource): Uint8Array {
        const uint8 =
            source instanceof Buffer
                ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
                : source instanceof ArrayBuffer
                ? new Uint8Array(source)
                : source;

        const isGzipped = uint8[0] === 0x1f && uint8[1] === 0x8b;
        return isGzipped ? pako.ungzip(uint8) : uint8;
    }

    public async readBytes(start: number, length: number): Promise<Uint8Array> {
        return this.data.slice(start, start + length);
    }

    public async *streamBytes(start: number, total: number, chunkSize = 2880): AsyncIterableIterator<Uint8Array> {
        let offset = start;
        while (offset < start + total) {
            const end = Math.min(offset + chunkSize, start + total);
            yield this.data.slice(offset, end);
            offset = end;
        }
    }

    public async readAll(): Promise<Uint8Array> {
        return this.data;
    }

    public get size(): number {
        return this.data.length;
    }

    public getData(): Uint8Array {
        return this.data;
    }
}
