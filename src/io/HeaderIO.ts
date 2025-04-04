import { FitsHeader } from '../core/FitsHeader';
import { FitsFileReader } from './FileReader';
import { parseHeaderLine, formatHeaderLine } from '../schema/fits-utils';

const BLOCK_SIZE = 2880;
const LINE_SIZE = 80;


export class HeaderParser {
    private readonly textDecoder = new TextDecoder('ascii');

    constructor(private readonly fileReader: FitsFileReader) {}

    public async parseHeader(start: number): Promise<{ header: FitsHeader, headerSize: number }> {
        const header = new FitsHeader();
        let position = start;
        let endOfHeader = false;

        for (let i = 0; i < 256 && !endOfHeader; i++) {
            const block = await this.fileReader.readBytes(position, BLOCK_SIZE);
            const text = this.textDecoder.decode(block);
            const lines = [];

            for (let i = 0; i < text.length; i += 80) {
                lines.push(text.slice(i, i + 80));
            }

            for (const line of lines) {
                if (line.startsWith('END')) {
                    endOfHeader = true;
                    break;
                }

                const parsed = parseHeaderLine(line);
                if (parsed?.value !== undefined) {
                    header.set(parsed.key, parsed.value, parsed.comment);
                }
            }
            position += BLOCK_SIZE;
        }
        if (!endOfHeader) {
            throw new Error('Header not terminated with END keyword');
        }
        return { header, headerSize: position - start };
    }

    public get blockSize(): number {
        return BLOCK_SIZE;
    }
}

export class HeaderWriter {
    constructor(private readonly header: FitsHeader) {}

    public toBlock(): Uint8Array {
        const lines: string[] = [];

        for (const [key, entry] of this.header.getEntries()) {
            lines.push(formatHeaderLine(key, entry.value, entry.comment));
        }

        lines.push('END'.padEnd(LINE_SIZE, ' '));

        const headerText = lines.join('');
        const paddingLength = BLOCK_SIZE - (headerText.length % BLOCK_SIZE || BLOCK_SIZE);
        const paddedHeader = headerText + ' '.repeat(paddingLength);

        const encoder = new TextEncoder(); // ASCII-safe for FITS
        return encoder.encode(paddedHeader);
    }

    public get blockSize(): number {
        return BLOCK_SIZE;
    }
}
