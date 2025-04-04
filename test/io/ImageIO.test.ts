import { expect } from 'chai';
import { ImageParser, ImageWriter } from '../../src/io/ImageIO';
import { FitsFileReader } from '../../src/io/FileReader';
import { FitsHeader } from '../../src/core/FitsHeader';
import { FitsHDU } from '../../src/interfaces';

function createTestImageBuffer(pixelValues: number[], bitpix: number): Uint8Array {
    const rows = 2;
    const cols = 3;
    const header = [
        `SIMPLE  =                    T`,
        `BITPIX  = ${bitpix.toString().padStart(20)}`,
        `NAXIS   =                    2`,
        `NAXIS1  = ${cols.toString().padStart(20)}`,
        `NAXIS2  = ${rows.toString().padStart(20)}`,
        `BSCALE  =                  1.0`,
        `BZERO   =                  0.0`,
        `END`
    ].map(line => line.padEnd(80, ' ')).join('').padEnd(2880, ' ');

    const headerBytes = new TextEncoder().encode(header);
    const dataBytes = new Uint8Array(pixelValues);

    const paddedData = new Uint8Array(Math.ceil(dataBytes.length / 2880) * 2880);
    paddedData.set(dataBytes);

    const full = new Uint8Array(headerBytes.length + paddedData.length);
    full.set(headerBytes);
    full.set(paddedData, headerBytes.length);
    return full;
}


describe('ImageIO', () => {
    const pixelValues = [1, 2, 3, 4, 5, 6];
    const bitpix = 8;

    describe('ImageParser', () => {
        it('should correctly parse a 2x3 8-bit FITS image', async () => {
            const buffer = createTestImageBuffer(pixelValues, bitpix);
            const reader = new FitsFileReader(buffer);
            const parser = new ImageParser(reader);

            const header = new FitsHeader({
                BITPIX: bitpix,
                NAXIS: 2,
                NAXIS1: 3,
                NAXIS2: 2,
                BSCALE: 1,
                BZERO: 0,
            });

            const hdu: FitsHDU = {
                headerOffset: 0,
                dataOffset: 2880,
                shape: [3, 2],
                type: 'image',
                header,
            };

            const result = await parser.readImage(hdu);
            expect(result.shape).to.deep.equal([3, 2]);
            expect(result.data).to.deep.equal(pixelValues);
            expect(result.type).to.equal('image');
        });

        it('should throw on unsupported BITPIX', async () => {
            const header = new FitsHeader({
                BITPIX: 99,
                NAXIS: 2,
                NAXIS1: 1,
                NAXIS2: 1,
            });

            const hdu: FitsHDU = {
                headerOffset: 0,
                dataOffset: 0,
                shape: [1, 1],
                type: 'image',
                header,
            };

            const dummy = new Uint8Array(1);
            const reader = new FitsFileReader(dummy);

            const parser = new ImageParser(reader);

            await expect(parser.readImage(hdu)).to.be.rejectedWith('Unsupported BITPIX');
        });
    });

    describe('ImageWriter', () => {
        it('should correctly write and reparse 8-bit image data', async () => {
            const writer = new ImageWriter();

            const data = {
                shape: [3, 2],
                data: pixelValues,
                keys: [],
                type: 'image' as const,
            };

            const buffer = writer.toBinary(data, bitpix);
            expect(buffer).to.be.instanceOf(Uint8Array);
            expect([...buffer]).to.deep.equal(pixelValues);
        });

        it('should throw if data.shape does not match data length', () => {
            const writer = new ImageWriter();

            const badData = {
                shape: [2, 2],
                data: pixelValues,
                keys: [],
                type: 'image' as const,
            };

            expect(() => writer.toBinary(badData)).to.throw('Data length does not match shape');
        });

        it('should throw on unsupported BITPIX for writing', () => {
            const writer = new ImageWriter();
            const data = {
                shape: [3, 2],
                data: pixelValues,
                keys: [],
                type: 'image' as const,
            };

            expect(() => writer.toBinary(data, 99)).to.throw('Unsupported BITPIX for writing');
        });

        it('should throw on non-image data', () => {
            const writer = new ImageWriter();

            const badData = {
                shape: [3, 2],
                data: pixelValues,
                keys: [],
                type: 'table' as const, // incorrect type
            };

            expect(() => writer.toBinary(badData)).to.throw(`Data type is not 'image'`);
        });
    });
});
