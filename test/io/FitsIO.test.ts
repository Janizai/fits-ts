// test/io/FitsIO.spec.ts
import { describe, it } from 'mocha';
import { expect } from 'chai';
import 'chai-as-promised';

import { FitsReader, FitsWriter } from '../../src/io/FitsIO';
import { FitsHeader } from '../../src/core/FitsHeader';
import { FitsData } from '../../src/interfaces';

function createSimpleImageHDU(): { header: FitsHeader; data: FitsData } {
    const header = new FitsHeader({
        SIMPLE: true,
        BITPIX: 8,
        NAXIS: 2,
        NAXIS1: 3,
        NAXIS2: 2,
        BSCALE: 1,
        BZERO: 0
    });

    // shape matches [NAXIS1, NAXIS2] per your parser
    const data: FitsData = {
        type: 'image',
        shape: [3, 2],
        keys: [],
        data: new Uint8Array([1, 2, 3, 4, 5, 6])   // ← TypedArray now
    };

    return { header, data };
}

describe('FitsWriter', () => {
    it('should write and produce a valid Uint8Array', () => {
        const writer = new FitsWriter();
        const { header, data } = createSimpleImageHDU();

        writer.addHDU(header, data);
        const bytes = writer.write();

        expect(bytes).to.be.instanceOf(Uint8Array);
        expect(bytes.length % 2880).to.equal(0); // must be padded to 2880
    });

    it('should provide HDU metadata and length correctly', () => {
        const writer = new FitsWriter();
        const { header, data } = createSimpleImageHDU();

        writer.addHDU(header, data);
        expect(writer.length).to.equal(1);

        const hdu = Array.from(writer.entries())[0];
        expect(hdu.header.get('NAXIS')).to.equal(2);
        expect(hdu.data!.shape).to.deep.equal([3, 2]);
    });

    it('should iterate through HDUs', () => {
        const writer = new FitsWriter();
        const { header, data } = createSimpleImageHDU();
        writer.addHDU(header, data);

        const entries = [...writer.entries()];
        expect(entries.length).to.equal(1);
        expect(entries[0].header.get('BITPIX')).to.equal(8);
    });
});

describe('FitsReader', () => {
    it('should parse headers and read image data', async () => {
        const writer = new FitsWriter();
        const { header, data } = createSimpleImageHDU();
        writer.addHDU(header, data);
        const buffer = writer.write();

        const reader = new FitsReader(buffer);
        await reader.parseHeaders();
        expect(reader.hduMetadata.length).to.equal(1);

        const hdu = await reader.getFitsHDU(0);
        expect(hdu.get('BITPIX')).to.equal(8);

        const fitsdata = await reader.getData(0);
        // data.data is now a Uint8Array → convert before comparing
        expect(Array.from(fitsdata.data as Uint8Array)).to.deep.equal([1, 2, 3, 4, 5, 6]);
    });

    it('should yield HDUs from iterator', async () => {
        const writer = new FitsWriter();
        const { header, data } = createSimpleImageHDU();
        writer.addHDU(header, data);
        
        const buffer = writer.write();
        const reader = new FitsReader(buffer);
        await reader.ensureHeadersParsed();

        const entries = [];
        for await (const hdu of reader.iterateHDUs()) {
            entries.push(hdu);
        }

        expect(entries.length).to.equal(1);
        expect(entries[0].header.get('NAXIS1')).to.equal(3);
    });

    it('should throw on out-of-bounds HDU index', async () => {
        const writer = new FitsWriter();
        const { header, data } = createSimpleImageHDU();
        writer.addHDU(header, data);
        const buffer = writer.write();

        const reader = new FitsReader(buffer);
        await reader.ensureHeadersParsed();

        await expect(reader.getFitsHDU(5)).to.be.rejectedWith('Invalid FitsHDU index');
        await expect(reader.getData(10)).to.be.rejectedWith('Invalid FitsHDU index');
    });
});
