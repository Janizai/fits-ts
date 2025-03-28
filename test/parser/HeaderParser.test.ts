import { expect } from 'chai';
import { describe, it } from 'mocha';
import { HeaderParser } from '../../src/parser/HeaderParser';
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

        // Convert to Blob
        const blob = new Blob([block]);
        const fileReader = new FitsFileReader(blob);
        const parser = new HeaderParser(fileReader);

        const { header, headerSize } = await parser.parseHeader(0);
        expect(header['SIMPLE']).to.equal('T');
        expect(header['NAXIS']).to.equal('2');
        // We expect headerSize to be exactly 2880 in this scenario (one block).
        expect(headerSize).to.equal(blockSize);
    });

    it('should parse multiple blocks if END is not in the first block', async () => {
        // Suppose we have a scenario where 'END' is in the second block
        const blockSize = 2880;
        const block1 = new Uint8Array(blockSize); // no 'END' here
        const block2 = new Uint8Array(blockSize);

        const lines = [
            'NAXIS   =                    2',
            'END'
        ];
        const paddedLines = lines.map(line => line.padEnd(80, ' ')).join('');
        block2.set(new TextEncoder().encode(paddedLines), 0);

        const blob = new Blob([block1, block2]);
        const fileReader = new FitsFileReader(blob);
        const parser = new HeaderParser(fileReader);

        const { header, headerSize } = await parser.parseHeader(0);
        expect(header['NAXIS']).to.equal('2');
        // We expect headerSize to be blockSize * 2 = 5760
        expect(headerSize).to.equal(blockSize * 2);
    });
});
