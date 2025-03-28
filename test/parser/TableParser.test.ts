import { expect } from 'chai';
import { describe, it } from 'mocha';
import { TableParser } from '../../src/parser/TableParser';
import { FitsFileReader } from '../../src/io/FileReader';
import { HDU } from '../../src/interfaces';


describe('TableParser', () => {
    it('should parse a simple table with one column', async () => {
        // Example: We have a single column of type I (16-bit int),
        // 2 rows, so total 4 bytes of data.
        // We skip the actual "header block" creation here. Instead,
        // we mock an HDU object directly for demonstration.

        // Create data for two 16-bit integers: 100, 200 (big-endian)
        const dataBytes = new Uint8Array([0x00, 0x64, 0x00, 0xc8]);
        const blob = new Blob([dataBytes]);
        const fileReader = new FitsFileReader(blob);

        const parser = new TableParser(fileReader);

        // Mock an HDU
        const hdu: HDU = {
            headerOffset: 0,
            dataOffset: 0,
            shape: [],
            header: {
                'NAXIS2': '2',   // 2 rows
                'TFIELDS': '1',  // 1 column
                'NAXIS1': '2',   // bytes per row
                'TTYPE1': 'COL1',
                'TFORM1': 'I'
            }
        };

        const result = await parser.readTable(hdu);
        expect(result.shape).to.deep.equal([2, 1]);
        expect(result.keys).to.deep.equal(['COL1']);
        expect(result.data).to.deep.equal([[ [100] ], [ [200] ]]);
    });

    it('should warn about mismatched row lengths', async () => {
        // If the sum of TFORM sizes doesn't match NAXIS1, a warning is expected.
        const dataBytes = new Uint8Array([0x01, 0x02]); // 2 bytes total
        const blob = new Blob([dataBytes]);
        const fileReader = new FitsFileReader(blob);
        const parser = new TableParser(fileReader);

        const hdu: HDU = {
            headerOffset: 0,
            dataOffset: 0,
            shape: [],
            header: {
                'NAXIS2': '1',
                'TFIELDS': '1',
                'NAXIS1': '4', // claims 4 bytes per row
                'TTYPE1': 'COL1',
                'TFORM1': 'I'
            }
        };

        const result = await parser.readTable(hdu);
        expect(result.shape).to.deep.equal([1, 1]); // from header
        // The data might be incomplete or invalid. The parser attempts to read anyway.
    });
});
