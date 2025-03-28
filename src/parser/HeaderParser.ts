import { FitsHeader } from '../interfaces';
import { FitsFileReader } from '../io/FileReader';

const BLOCK_SIZE = 2880;

export class HeaderParser {
    private readonly textDecoder = new TextDecoder('ascii');

    constructor(private readonly fileReader: FitsFileReader) {}

    public async parseHeader(start: number): Promise<{ header: FitsHeader, headerSize: number }> {
        const header: FitsHeader = {};
        let position = start;
        let endOfHeader = false;

        while (!endOfHeader) {
            const block = await this.fileReader.readBytes(position, BLOCK_SIZE);
            const text = this.textDecoder.decode(block);
            const lines = text.match(/.{1,80}/g) || [];

            for (const line of lines) {
                if (line.startsWith('END')) {
                    endOfHeader = true;
                    break;
                }
                
                //TODO: Add reading comments
                const key = line.slice(0, 8).trim();
                const value = line.slice(10, 80).split('/')[0].trim();
                if (key) {
                    header[key] = value;
                }
            }
            position += BLOCK_SIZE;
        }
        return { header, headerSize: position - start };
    }

    public get blockSize(): number {
        return BLOCK_SIZE;
    }
}
