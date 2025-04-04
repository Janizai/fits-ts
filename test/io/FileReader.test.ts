import pako from 'pako';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { FitsFileReader } from '../../src/io/FileReader';

describe('FitsFileReader', () => {
    const text = 'SIMPLE  =                    T / FITS file';
    const bytes = new TextEncoder().encode(text);
    const padded = new Uint8Array(2880);
    padded.set(bytes, 0);

    it('should read from ArrayBuffer', async () => {
        const reader = new FitsFileReader(padded.buffer);
        const result = await reader.readBytes(0, 10);
        expect(result.length).to.equal(10);
    });

    it('should read from Uint8Array', async () => {
        const reader = new FitsFileReader(padded);
        const result = await reader.readBytes(10, 5);
        expect(result.length).to.equal(5);
    });

    it('should read from Buffer (Node.js)', async () => {
        const buf = Buffer.from(padded.buffer);
        const reader = new FitsFileReader(buf);
        const result = await reader.readBytes(0, 5);
        expect(result.length).to.equal(5);
    });

    it('should stream bytes in chunks', async () => {
        const reader = new FitsFileReader(padded);
        const chunks: Uint8Array[] = [];
        for await (const chunk of reader.streamBytes(0, 2880, 1024)) {
            chunks.push(chunk);
        }
        expect(chunks.length).to.equal(3);
        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        expect(totalLength).to.equal(2880);
    });

    it('should read all bytes', async () => {
        const reader = new FitsFileReader(padded);
        const all = await reader.readAll();
        expect(all.length).to.equal(2880);
    });

    it('should expose size and internal data', () => {
        const reader = new FitsFileReader(padded);
        expect(reader.size).to.equal(2880);
        expect(reader.getData()).to.be.instanceOf(Uint8Array);
    });

    it('should ungzip compressed input', async () => {
        const gzipped = pako.gzip(padded);
        const reader = new FitsFileReader(gzipped);
        const result = await reader.readBytes(0, 6);
        expect(result).to.eql(padded.slice(0, 6));
    });
});
