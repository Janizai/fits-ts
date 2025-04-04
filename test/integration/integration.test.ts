import { expect } from 'chai';
import fs from 'fs/promises';
import sinon from 'sinon';

import { Fits } from '../../src/Fits';
import { FitsHeader } from '../../src/core/FitsHeader';
import { FitsData, FitsHDU } from '../../src/interfaces';


function mockReader(): any {
    const header = new FitsHeader({ SIMPLE: true, NAXIS: 1 });
    const hdu: FitsHDU = {
        header,
        shape: [1],
        type: 'image',
        headerOffset: 0,
        dataOffset: 0,
    };

    return {
        parseHeaders: sinon.fake.resolves(undefined),
        getData: sinon.fake.resolves({ shape: [1], keys: [], data: [99], type: 'image' }),
        hduMetadata: [hdu]
    };
}

describe('Fits', () => {
    let fits: Fits;
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        fits = new Fits();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Basic HDU manipulation', () => {
        it('should start with no HDUs', () => {
            expect(fits.length).to.equal(0);
        });

        it('should add a new HDU', () => {
            const header = new FitsHeader({ SIMPLE: true, NAXIS: 2 });
            const data: FitsData = { shape: [3, 3], keys: [], data: [], type: 'image' };
            fits.addHDU(header, data);

            expect(fits.length).to.equal(1);
            expect(fits.getHeader(0)).to.equal(header);
        });

        it('should set an HDU at a specific index', () => {
            const header1 = new FitsHeader({ SIMPLE: true });
            const data1: FitsData = { shape: [1, 1], keys: [], data: [1], type: 'image' };
            const header2 = new FitsHeader({ SIMPLE: false });
            const data2: FitsData = { shape: [2, 2], keys: [], data: [1, 2, 3, 4], type: 'image' };

            fits.addHDU(header1, data1);
            fits.setHDU(0, header2, data2);

            expect(fits.getHeader(0)).to.equal(header2);
        });

        it('should delete an HDU', () => {
            const header = new FitsHeader({ SIMPLE: true });
            const data: FitsData = { shape: [2], keys: [], data: [42], type: 'image' };

            fits.addHDU(header, data);
            expect(fits.length).to.equal(1);

            fits.deleteHDU(0);
            expect(fits.length).to.equal(0);
        });

        it('should throw error for invalid HDU access', () => {
            expect(() => fits.getHDU(0)).to.throw('Invalid HDU index: 0');
            expect(() => fits.setHDU(0, new FitsHeader(), { shape: [], keys: [], data: [], type: 'image' }))
                .to.throw('Invalid HDU index: 0');
            expect(() => fits.deleteHDU(0)).to.throw('Invalid HDU index: 0');
        });
    });

    describe('Iteration and clearing', () => {
        it('should iterate over entries correctly', async () => {
            const header = new FitsHeader({ SIMPLE: true });
            const data: FitsData = { shape: [1], keys: [], data: [123], type: 'image' };
            fits.addHDU(header, data);

            const entries = await fits.entriesArray();
            expect(entries).to.have.lengthOf(1);
            expect(entries[0].header).to.equal(header);
            expect(entries[0].data).to.deep.equal(data);
        });

        it('entries() should be a working async iterator', async () => {
            const header = new FitsHeader({ SIMPLE: true });
            const data: FitsData = { shape: [1], keys: [], data: [101], type: 'image' };
            fits.addHDU(header, data);

            const result: number[] = [];
            for await (const { data } of fits.entries()) {
                result.push(data.data[0] as number);
            }

            expect(result).to.deep.equal([101]);
        });

        it('should clear all internal state', () => {
            const header = new FitsHeader({ SIMPLE: true });
            const data: FitsData = { shape: [], keys: [], data: [], type: 'image' };
            fits.addHDU(header, data);

            fits.clear();

            expect(fits.length).to.equal(0);
            expect(() => fits.getHDU(0)).to.throw();
        });
    });

    describe('Data loading and reading', () => {
        it('should load from reader and populate HDUs', async () => {
            const fits = new Fits(undefined as any);
            const fakeReader = mockReader();
            (fits as any).reader = fakeReader;

            await fits.load();
            expect(fits.length).to.equal(1);
            expect(fits.getHeader(0)).to.deep.equal(fakeReader.hduMetadata[0].header);
        });

        it('should not load multiple times if already loaded', async () => {
            const fits = new Fits(undefined as any);
            const fakeReader = mockReader();
            const spy = fakeReader.parseHeaders;
            (fits as any).reader = fakeReader;

            await fits.load();
            await fits.load(); // Should not call again
            expect(spy.calledOnce).to.be.true;
        });

        it('should return cached data if available', async () => {
            const header = new FitsHeader({ SIMPLE: true });
            const data: FitsData = { shape: [1], keys: [], data: [42], type: 'image' };

            const fits = new Fits();
            fits.addHDU(header, data);

            const result = await fits.getData(0);
            expect(result).to.deep.equal(data);
        });

        it('should fetch data via reader if not present', async () => {
            const fits = new Fits(undefined as any);
            const fakeReader = mockReader();
            (fits as any).reader = fakeReader;

            await fits.load();
            const result = await fits.getData(0);
            expect(result.data).to.deep.equal([99]);
        });

        it('should throw when getData() has no data or reader', async () => {
            const fits = new Fits();
            fits.addHDU(new FitsHeader({ SIMPLE: true }), { shape: [1], keys: [], data: [], type: 'image' });
            (fits as any).reader = undefined;
            (fits as any).hdus[0].data = undefined;

            try {
                await fits.getData(0);
            } catch (e: any) {
                expect(e.message).to.include('No data available');
            }
        });
    });

    describe('Export and serialization', () => {
        it('should export toBytes()', async () => {
            const header = new FitsHeader({ SIMPLE: true, BITPIX: 8, NAXIS: 1, NAXIS1: 1 });
            const data: FitsData = { shape: [1, 1], keys: [], data: [1], type: 'image' };
            const fits = new Fits();
            fits.addHDU(header, data);

            const bytes = await fits.toBytes();
            expect(bytes).to.be.instanceOf(Uint8Array);
            expect(bytes.length).to.be.greaterThan(0);
        });

        it('should export toBuffer()', async () => {
            const header = new FitsHeader({ SIMPLE: true, BITPIX: 8, NAXIS: 1, NAXIS1: 1 });
            const data: FitsData = { shape: [1, 1], keys: [], data: [1], type: 'image' };
            const fits = new Fits();
            fits.addHDU(header, data);
        
            const buffer = await fits.toBuffer();
            expect(buffer).to.be.instanceOf(Buffer);
            expect(buffer.length).to.be.greaterThan(0);
        });

        it('should call saveAsFile()', async () => {
            const header = new FitsHeader({ SIMPLE: true, BITPIX: 8, NAXIS: 1, NAXIS1: 1 });
            const data: FitsData = { shape: [1, 1], keys: [], data: [1], type: 'image' };
            const fits = new Fits();
            fits.addHDU(header, data);
        
            const writeStub = sandbox.stub(fs, 'writeFile').resolves();
        
            await fits.saveToFile('test.fits');
            expect(writeStub.calledOnce).to.be.true;
            expect(writeStub.firstCall.args[0]).to.equal('test.fits');
            expect(writeStub.firstCall.args[1]).to.be.instanceOf(Buffer);
        
            writeStub.restore();
        });
    });
});
