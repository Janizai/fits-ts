import { FitsHeader, HDU, FitsData } from './interfaces';
import { FitsFileReader } from './io/FileReader';
import { HeaderParser } from './parser/HeaderParser';
import { TableParser } from './parser/TableParser';
import { ImageParser } from './parser/ImageParser';

export class Fits {
    private readonly fileReader: FitsFileReader;
    private readonly headerParser: HeaderParser;
    private readonly tableParser: TableParser;
    private readonly imageParser: ImageParser;
    private readonly hduMetadata: HDU[] = [];
    private headerParsingPromise: Promise<void> | null = null;

    constructor(file: Blob) {
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

                const naxis = parseInt(header['NAXIS'] || '0', 10);
                const shape: number[] = [];
                for (let i = 1; i <= naxis; i++) {
                    shape.push(parseInt(header[`NAXIS${i}`] || '0', 10));
                }

                const bitpix = parseInt(header['BITPIX'] || '0', 10);
                const bytesPerElement = Math.abs(bitpix) / 8;
                const dataSize = naxis > 0 ? shape.reduce((a, b) => a * b, 1) * bytesPerElement : 0;
                const alignedDataOffset = Math.ceil(position / blockSize) * blockSize;

                this.hduMetadata.push({ headerOffset, dataOffset: alignedDataOffset, shape, header });
                position = alignedDataOffset + Math.ceil(dataSize / blockSize) * blockSize;

            } catch (error) {
                break;
            }
        }
    }

    private async ensureHeadersParsed(): Promise<void> {
        if (!this.headerParsingPromise) {
            this.headerParsingPromise = this.parseHeaders();
        }
        return this.headerParsingPromise;
    }

    public async getHeaders(): Promise<FitsHeader[]> {
        await this.ensureHeadersParsed();
        return this.hduMetadata.map(hdu => hdu.header);
    }

    public async getHDU(index: number): Promise<FitsHeader> {
        await this.ensureHeadersParsed();
        if (index < 0 || index >= this.hduMetadata.length) {
          return {};
        }
        const hdu = this.hduMetadata[index];
    
        if (!hdu.header) {
            const { header } = await this.headerParser.parseHeader(hdu.headerOffset);
            hdu.header = header;
        }
        return hdu.header;
    }

    public async getData(index: number): Promise<FitsData> {
        await this.ensureHeadersParsed();
        
        if (index < 0 || index >= this.hduMetadata.length) {
            return { shape: [], data: [], keys: [] };
        }
        const hdu = this.hduMetadata[index];
        
        if (!hdu.header) {
            const { header } = await this.headerParser.parseHeader(hdu.headerOffset);
            hdu.header = header;
        }
        // If the header defines table fields (TFIELDS), use the table parser;
        // otherwise assume image data.
        return hdu.header['TFIELDS']
            ? await this.tableParser.readTable(hdu)
            : await this.imageParser.readImage(hdu);
    }
}
