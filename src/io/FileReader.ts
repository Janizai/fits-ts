import pako from 'pako';

export class FitsFileReader {
    constructor(private readonly file: Blob) {}

    public static fromBuffer(fileBuffer: Buffer): Blob {
        const isGzipped = fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b;
        if (isGzipped) {
            return new Blob([pako.ungzip(fileBuffer)]);
        }
        return new Blob([fileBuffer]);
    }

    public async readBytes(start: number, length: number): Promise<ArrayBuffer> {
        const slice = this.file.slice(start, start + length);
        return await slice.arrayBuffer();
    }

    public get size(): number {
        return this.file.size;
    }
}
