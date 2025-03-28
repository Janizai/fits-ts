import chaiAsPromised from 'chai-as-promised';
import chai from 'chai';
chai.use(chaiAsPromised);
const expect = chai.expect;

import { describe, it } from 'mocha';
import { ImageParser } from '../../src/parser/ImageParser';
import { FitsFileReader } from '../../src/io/FileReader';
import { HDU } from '../../src/interfaces';

describe('ImageParser', () => {
    it('should parse an 8-bit image correctly', async () => {
        // Suppose we have a 2x2 image, 8-bit (BITPIX=8).
        // That's 4 bytes of data. We'll fill them with 10, 20, 30, 40.
        const dataBytes = new Uint8Array([10, 20, 30, 40]);
        const blob = new Blob([dataBytes]);
        const fileReader = new FitsFileReader(blob);
        const parser = new ImageParser(fileReader);

        const hdu: HDU = {
            headerOffset: 0,
            dataOffset: 0,
            shape: [2, 2],
            header: {
                'BITPIX': '8',
                'BSCALE': '1',
                'BZERO': '0'
            }
        };

        const result = await parser.readImage(hdu);
        expect(result.shape).to.deep.equal([2, 2]);
        // Data is read row-wise: [10, 20, 30, 40].
        expect(result.data).to.deep.equal([10, 20, 30, 40]);
    });

    it('should apply BSCALE and BZERO', async () => {
        // 2x2 again, but with scaling
        const dataBytes = new Uint8Array([1, 2, 3, 4]);
        const blob = new Blob([dataBytes]);
        const fileReader = new FitsFileReader(blob);
        const parser = new ImageParser(fileReader);

        const hdu: HDU = {
            headerOffset: 0,
            dataOffset: 0,
            shape: [2, 2],
            header: {
                'BITPIX': '8',
                'BSCALE': '2',  // multiply each value by 2
                'BZERO': '10'   // then add 10
            }
        };

        const result = await parser.readImage(hdu);
        expect(result.data).to.deep.equal([
            (1 * 2 + 10), 
            (2 * 2 + 10),
            (3 * 2 + 10),
            (4 * 2 + 10),
        ]);
    });

    it('should throw error for unsupported BITPIX', async () => {
        const dataBytes = new Uint8Array([1, 2, 3, 4]);
        const blob = new Blob([dataBytes]);
        const fileReader = new FitsFileReader(blob);
        const parser = new ImageParser(fileReader);
        const bitpix = 99;
    
        const hdu: HDU = {
            headerOffset: 0,
            dataOffset: 0,
            shape: [2, 2],
            header: {
                'BITPIX': bitpix.toString()
            }
        };
    
        await expect(parser.readImage(hdu)).to.be.rejectedWith(`Unsupported BITPIX value`);
    });
});
