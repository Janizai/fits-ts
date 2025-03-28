import { expect } from 'chai';
import { describe, it } from 'mocha';
import { FitsFileReader } from '../../src/io/FileReader';

describe('FitsFileReader', () => {
    it('should create a Blob from a non-gzipped Buffer', () => {
        const buffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // Some random bytes
        const blob = FitsFileReader.fromBuffer(buffer);
        expect(blob).to.be.instanceOf(Blob);
        expect(blob.size).to.equal(buffer.length);
    });

    it('should create a Blob from a gzipped Buffer and uncompress it', () => {
        const gzippedHeader = Buffer.from([0x1f, 0x8b, /* ... etc ... */]);

        const blob = FitsFileReader.fromBuffer(gzippedHeader);
        expect(blob).to.be.instanceOf(Blob);
    });

    it('should read bytes from the correct slice of a file', async () => {
        // Create a Blob with known content
        const content = new Uint8Array([10, 20, 30, 40, 50]);
        const blob = new Blob([content]);
        const fileReader = new FitsFileReader(blob);

        // Read first 3 bytes
        const result = await fileReader.readBytes(0, 3);
        const array = new Uint8Array(result);
        expect(array).to.deep.equal(new Uint8Array([10, 20, 30]));

        // Read next 2 bytes
        const secondResult = await fileReader.readBytes(3, 2);
        const secondArray = new Uint8Array(secondResult);
        expect(secondArray).to.deep.equal(new Uint8Array([40, 50]));
    });

    it('should report correct file size', () => {
        const content = new Uint8Array([10, 20, 30, 40, 50]);
        const blob = new Blob([content]);
        const fileReader = new FitsFileReader(blob);
        expect(fileReader.size).to.equal(5);
    });
});
