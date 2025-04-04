import { expect } from 'chai';
import { FitsHeader } from '../../src/core/FitsHeader';
import { FitsFileReader } from '../../src/io/FileReader';
import { FitsData, FitsHDU } from '../../src/interfaces';
import { TableParser, TableWriter, deriveColumnFormats } from '../../src/io/TableIO';

function createTestTableBuffer(): Uint8Array {
    const header = [
        `SIMPLE  =                    T`,
        `BITPIX  =                    8`,
        `NAXIS   =                    2`,
        `NAXIS1  =                    6`,
        `NAXIS2  =                    2`,
        `TFIELDS =                    2`,
        `TTYPE1  = 'Column1 '`,
        `TFORM1  = '1I'`,
        `TTYPE2  = 'Column2 '`,
        `TFORM2  = '1E'`,
        `END`
    ].map(card => card.padEnd(80, ' ')).join('').padEnd(2880, ' ');

    const headerBytes = new TextEncoder().encode(header);

    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setInt16(0, 1000, false);  view.setFloat32(2, 3.5, false);
    view.setInt16(6, 2000, false);  view.setFloat32(8, 7.25, false);

    const dataBytes = new Uint8Array(buffer);
    const paddedData = new Uint8Array(Math.ceil(dataBytes.length / 2880) * 2880);
    paddedData.set(dataBytes);

    const full = new Uint8Array(headerBytes.length + paddedData.length);
    full.set(headerBytes);
    full.set(paddedData, headerBytes.length);
    return full;
}

describe('TableIO', () => {
    describe('deriveColumnFormats()', () => {
        it('should correctly parse valid TFORM entries', () => {
            const header = new FitsHeader({
                TFORM1: '1I',
                TFORM2: '2E'
            });

            const formats = deriveColumnFormats(header, 2);
            expect(formats).to.deep.equal([
                { count: 1, type: 'I', size: 2 },
                { count: 2, type: 'E', size: 8 }
            ]);
        });

        it('should skip malformed TFORM entries with warnings', () => {
            const header = new FitsHeader({
                TFORM1: 'XYZ',
                TFORM2: '2E'
            });

            const formats = deriveColumnFormats(header, 2);
            expect(formats.length).to.equal(1);
            expect(formats[0].type).to.equal('E');
        });
    });

    describe('TableParser', () => {
        it('should parse a simple 2-row table with int and float columns', async () => {
            const buffer = createTestTableBuffer();
            const reader = new FitsFileReader(buffer);
            const parser = new TableParser(reader);

            const header = new FitsHeader({
                NAXIS1: 6,
                NAXIS2: 2,
                TFIELDS: 2,
                TFORM1: '1I',
                TTYPE1: 'Column1',
                TFORM2: '1E',
                TTYPE2: 'Column2',
            });

            const hdu: FitsHDU = {
                header,
                dataOffset: 2880,
                headerOffset: 0,
                shape: [2, 2],
                type: 'table',
            };

            const data = await parser.readTable(hdu);
            expect(data.type).to.equal('table');
            expect(data.shape).to.deep.equal([2, 2]);
            expect(data.keys).to.include.members(['Column1', 'Column2']);
            expect(data.data[0][0]).to.equal(1000);
            expect(data.data[0][1]).to.be.closeTo(3.5, 0.001);
            expect(data.data[1][0]).to.equal(2000);
            expect(data.data[1][1]).to.be.closeTo(7.25, 0.001);
        });
    });

    describe('TableWriter', () => {
        it('should correctly serialize table data into binary format', () => {
            const writer = new TableWriter();
            const columnFormats = [
                { count: 1, type: 'I', size: 2 },
                { count: 1, type: 'E', size: 4 }
            ];

            const tableData: FitsData = {
                type: 'table',
                shape: [2, 2],
                keys: ['Column1', 'Column2'],
                data: [
                    [123, 1.5],
                    [456, 3.25]
                ]
            };

            const buffer = writer.toBinary(tableData, columnFormats);
            expect(buffer.length).to.equal(12); // 6 bytes per row

            const view = new DataView(buffer.buffer);
            expect(view.getInt16(0, false)).to.equal(123);
            expect(view.getFloat32(2, false)).to.be.closeTo(1.5, 0.01);
            expect(view.getInt16(6, false)).to.equal(456);
            expect(view.getFloat32(8, false)).to.be.closeTo(3.25, 0.01);
        });

        it('should throw if a row is not an array', () => {
            const writer = new TableWriter();
            const badData = {
                type: 'table',
                shape: [1, 1],
                keys: ['Col'],
                data: [123], // not an array of arrays
            };

            const formats = [{ count: 1, type: 'I', size: 2 }];

            expect(() => writer.toBinary(badData as any, formats)).to.throw(/Row 0 is not an array/);
        });
    });
});
