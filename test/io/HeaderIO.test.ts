import { expect } from 'chai';
import { describe, it } from 'mocha';
import { HeaderParser } from '../../src/io/HeaderIO';
import { FitsFileReader } from '../../src/io/FileReader';

/**
 * Helper to build a minimal FITS header block.
 * Each header line is 80 bytes. We can create lines with the 'END' keyword
 * to terminate. This is obviously contrived, but enough to test parsing logic.
 */
function buildMinimalHeader(): Uint8Array {
    const lines = [
        'SIMPLE  =                    T', // typical FITS key
        'NAXIS   =                    2',
        'END', // signals end of header
    ];

    // Each line must be padded to 80 characters
    const paddedLines = lines.map(line => line.padEnd(80, ' '));
    const block = paddedLines.join('');
    return new TextEncoder().encode(block);
}

describe('HeaderParser', () => {
    it('should parse a minimal header correctly', async () => {
        // Build a single block of 2880 bytes (one block).
        // For brevity, we only fill part of it with text, rest are zeros.
        const headerBytes = buildMinimalHeader();
        const blockSize = 2880;
        const block = new Uint8Array(blockSize);
        block.set(headerBytes, 0);

        const fileReader = new FitsFileReader(block);
        const parser = new HeaderParser(fileReader);

        const { header, headerSize } = await parser.parseHeader(0);
        expect(header.get('SIMPLE')).to.deep.equal(true);
        expect(header.get('NAXIS')).to.deep.equal(2);

        expect(headerSize).to.equal(blockSize);
    });

    it('should parse multiple blocks if END is not in the first block', async () => {
        // Suppose we have a scenario where 'END' is in the second block
        const blockSize = 2880;
        const block1 = new Uint8Array(blockSize); // no 'END' here
        const block2 = new Uint8Array(blockSize);

        const headerBytes = buildMinimalHeader();
        block2.set(headerBytes, 0);

        const merged = new Uint8Array(blockSize * 2);
        merged.set(block1, 0);
        merged.set(block2, blockSize);

        const fileReader = new FitsFileReader(merged);
        const parser = new HeaderParser(fileReader);

        const { header, headerSize } = await parser.parseHeader(0);
        expect(header.get('NAXIS')).to.deep.equal(2);

        expect(headerSize).to.equal(blockSize * 2);
    });
});
