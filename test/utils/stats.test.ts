import { expect } from 'chai';
import { getStats } from '../../src/utils/stats';
import { FitsData } from '../../src/interfaces';

describe('getStats', () => {
    describe('image data', () => {
        it('should compute statistics correctly for image data', () => {
            const image: FitsData = {
                type: 'image',
                shape: [2, 2],
                keys: [],
                data: [1, 2, 3, 4],
            };

            const result = getStats(image);
            expect(result.keys).to.deep.equal(['', 'Image Data']);
            expect(result.data[0]).to.deep.equal(['Min', 1]);
            expect(result.data[1]).to.deep.equal(['Max', 4]);
            expect(result.data[2][0]).to.equal('Mean');
            expect(result.data[2][1]).to.be.closeTo(2.5, 0.0001);
            expect(result.data[3][0]).to.equal('Std Dev');
            expect(result.data[3][1]).to.be.closeTo(1.118, 0.001);
        });

        it('should throw if non-numeric values are present', () => {
            const image: FitsData = {
                type: 'image',
                shape: [2],
                keys: [],
                data: [1, 'x', 3],
            };

            expect(() => getStats(image)).to.throw(/Non-numeric value/);
        });
    });

    describe('table data', () => {
        it('should compute statistics per column for table data', () => {
            const table: FitsData = {
                type: 'table',
                shape: [2, 2],
                keys: ['A', 'B'],
                data: [
                    [1, 2],
                    [3, 4]
                ]
            };

            const result = getStats(table);
            expect(result.keys).to.deep.equal(['', 'A', 'B']);

            const meanA = (1 + 3) / 2;
            const stdA = Math.sqrt(((1 - meanA) ** 2 + (3 - meanA) ** 2) / 2);
            const meanB = (2 + 4) / 2;
            const stdB = Math.sqrt(((2 - meanB) ** 2 + (4 - meanB) ** 2) / 2);

            expect(result.data[0]).to.deep.equal(['Min', 1, 2]);
            expect(result.data[1]).to.deep.equal(['Max', 3, 4]);
            expect(result.data[2][0]).to.equal('Mean');
            expect(result.data[2][1]).to.be.closeTo(meanA, 0.0001);
            expect(result.data[2][2]).to.be.closeTo(meanB, 0.0001);
            expect(result.data[3][0]).to.equal('Std Dev');
            expect(result.data[3][1]).to.be.closeTo(stdA, 0.0001);
            expect(result.data[3][2]).to.be.closeTo(stdB, 0.0001);
        });

        it('should throw if a table column contains non-numeric values', () => {
            const table: FitsData = {
                type: 'table',
                shape: [2, 2],
                keys: ['X', 'Y'],
                data: [
                    [1, 'bad'],
                    [2, 3]
                ]
            };

            expect(() => getStats(table)).to.throw(/Non-numeric value/);
        });
    });

    describe('empty data', () => {
        it('should return empty keys and data arrays', () => {
            const empty: FitsData = {
                type: 'image',
                shape: [],
                keys: [],
                data: []
            };

            const result = getStats(empty);
            expect(result.keys).to.deep.equal([]);
            expect(result.data).to.deep.equal([]);
        });
    });

    describe('unsupported data types', () => {
        it('should throw for unknown types', () => {
            const bad: FitsData = {
                type: 'cube' as any,
                shape: [],
                keys: [],
                data: [0]
            };

            expect(() => getStats(bad)).to.throw(/Unsupported data type/);
        });
    });
});
