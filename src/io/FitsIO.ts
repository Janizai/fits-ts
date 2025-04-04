import { FitsHeader } from '../core/FitsHeader';
import { FitsHDU, FitsData } from '../interfaces';
import { ImageParser, ImageWriter } from './ImageIO';
import { HeaderParser, HeaderWriter } from './HeaderIO';
import { FitsFileSource, FitsFileReader } from './FileReader';
import { TableParser, TableWriter, deriveColumnFormats } from './TableIO';

export async function openFits(source: FitsFileSource): Promise<FitsReader> {
    const fits = new FitsReader(source);
    await fits.parseHeaders();
    return fits;
}

export class FitsReader {
    private readonly fileReader: FitsFileReader;
    private readonly headerParser: HeaderParser;
    private readonly tableParser: TableParser;
    private readonly imageParser: ImageParser;
    private headerParsingPromise: Promise<void> | null = null;

    public readonly hduMetadata: FitsHDU[] = [];

    constructor(file: FitsFileSource) {
        this.fileReader = new FitsFileReader(file);
        this.headerParser = new HeaderParser(this.fileReader);
        this.tableParser = new TableParser(this.fileReader);
        this.imageParser = new ImageParser(this.fileReader);
    }

    public async parseHeaders(): Promise<void> {
        let position = 0;
        const fileSize = this.fileReader.size;
        const blockSize = this.headerParser.blockSize;

        while (position < fileSize) {
            try {
                const headerOffset = position;
                const { header, headerSize } = await this.headerParser.parseHeader(position);

                position += headerSize;

                const naxis = header.get('NAXIS') ?? 0;
                const shape: number[] = [];
                for (let i = 1; i <= naxis; i++) {
                    shape.push(header.getNumber(`NAXIS${i}`) ?? 0);
                }

                const bitpix = header.get('BITPIX') ?? 0;
                const bytesPerElement = Math.abs(bitpix) / 8;
                const dataSize = naxis > 0 ? shape.reduce((a, b) => a * b, 1) * bytesPerElement : 0;

                const alignedDataOffset = Math.ceil(position / blockSize) * blockSize;

                const type = header.has('TFIELDS') ? 'table' : 'image';
                const hdu: FitsHDU = {
                    shape,
                    header,
                    dataOffset: alignedDataOffset,
                    headerOffset,
                    type
                };
                this.hduMetadata.push(hdu);

                position = alignedDataOffset + Math.ceil(dataSize / blockSize) * blockSize;

            } catch (error) {
                break;
            }
        }
    }

    public async ensureHeadersParsed(): Promise<void> {
        if (!this.headerParsingPromise) {
            this.headerParsingPromise = this.parseHeaders();
        }
        return this.headerParsingPromise;
    }

    public async getHeaders(): Promise<FitsHeader[]> {
        await this.ensureHeadersParsed();
        return this.hduMetadata.map(hdu => hdu.header);
    }

    public async getFitsHDU(index: number): Promise<FitsHeader> {
        await this.ensureHeadersParsed();
        if (index < 0 || index >= this.hduMetadata.length) {
          throw new Error(`Invalid FitsHDU index: ${index}`);
        }
        const hdu = this.hduMetadata[index];
    
        if (!hdu.header) {
            const { header } = await this.headerParser.parseHeader(hdu.headerOffset!);
            hdu.header = header;
        }
        return hdu.header;
    }

    public async getData(index: number): Promise<FitsData> {
        await this.ensureHeadersParsed();
        
        if (index < 0 || index >= this.hduMetadata.length) {
            throw new Error(`Invalid FitsHDU index: ${index}`);
        }
        const hdu = this.hduMetadata[index];
        
        if (!hdu.header) {
            const { header } = await this.headerParser.parseHeader(hdu.headerOffset!);
            hdu.header = header;
        }
        
        switch (hdu.type) {
            case 'table': return this.tableParser.readTable(hdu);
            case 'image': return this.imageParser.readImage(hdu);
            default: throw new Error(`Unsupported HDU type: ${hdu.type}`);
        }
    }

    public async *iterateHDUs(): AsyncIterableIterator<{ index: number; header: FitsHeader; data: FitsData }> {
        await this.ensureHeadersParsed();
        for (let i = 0; i < this.hduMetadata.length; i++) {
            const hdu = this.hduMetadata[i];
            const data = await this.getData(i);
            yield { index: i, header: hdu.header, data };
        }
    }
}

export class FitsWriter {
    private readonly hdus: { header: FitsHeader; data: FitsData }[] = [];

    public addHDU(header: FitsHeader, data: FitsData): void {
        this.hdus.push({ header, data });
    }

    public write(): Uint8Array {
        const chunks: Uint8Array[] = [];
        let position = 0;

        for (const { header, data } of this.hdus) {
            // Write header
            const headerWriter = new HeaderWriter(header);
            const headerBlock = headerWriter.toBlock();
            chunks.push(headerBlock);
            position += headerBlock.length;

            // Align data offset
            const paddingToData = align(position, headerWriter.blockSize) - position;
            if (paddingToData > 0) {
                chunks.push(new Uint8Array(paddingToData));
                position += paddingToData;
            }

            // Write data
            let dataBlock: Uint8Array;
            if (data.type === 'image') {
                dataBlock = new ImageWriter().toBinary(
                    data,
                    header.get('BITPIX'),
                    header.has('BSCALE') ? header.get('BSCALE') : 1,
                    header.has('BZERO') ? header.get('BZERO') : 0
                );
            } else {
                const columns = header.get('TFIELDS') ?? 0;
                const columnFormats = deriveColumnFormats(header, columns);
                dataBlock = new TableWriter().toBinary(data, columnFormats);
            }

            chunks.push(dataBlock);
            position += dataBlock.length;

            // Align end of data to next 2880 block
            const dataPadding = align(position, headerWriter.blockSize) - position;
            if (dataPadding > 0) {
                chunks.push(new Uint8Array(dataPadding));
                position += dataPadding;
            }
        }

        return concatenateBlocks(chunks);
    }

    public toBlob(): Blob {
        return new Blob([this.write()], { type: 'application/octet-stream' });
    }

    public get length(): number {
        return this.hdus.length;
    }

    public getHDU(index: number): { header: FitsHeader; data: FitsData } {
        return this.hdus[index];
    }

    public *entries(): IterableIterator<{ index: number; header: FitsHeader; data: FitsData }> {
        for (let i = 0; i < this.hdus.length; i++) {
            const { header, data } = this.hdus[i];
            yield { index: i, header, data };
        }
    }
}

function align(offset: number, blockSize: number): number {
    return Math.ceil(offset / blockSize) * blockSize;
}

function concatenateBlocks(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}
