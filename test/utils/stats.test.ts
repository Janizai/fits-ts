// test/utils/stats.spec.ts
import { expect } from 'chai';
import { getStats } from '../../src/utils/stats';
import { FitsData } from '../../src/interfaces';

describe('getStats', () => {
  describe('image data', () => {
    it('should compute statistics correctly for image data', () => {
      const image = {
        type:  'image',
        shape: [2, 2] as [number, number],
        keys:  [],
        data:  new Uint8Array([1, 2, 3, 4])
      } as unknown as FitsData;

      const result = getStats(image);
      expect(result.keys).to.deep.equal(['', 'Image Data']);
      expect(result.data[0]).to.deep.equal(['Min', 1]);
      expect(result.data[1]).to.deep.equal(['Max', 4]);
      expect(result.data[2][0]).to.equal('Mean');
      expect(result.data[2][1]).to.be.closeTo(2.5, 1e-4);
      expect(result.data[3][0]).to.equal('Std Dev');
      expect(result.data[3][1]).to.be.closeTo(1.118, 1e-3);
    });

    it('should throw if non-numeric values are present', () => {
      // bypass the TypedArray requirement so we can inject a string
      const image = {
        type:  'image',
        shape: [3, 1] as [number, number],
        keys:  [],
        data:  [1, 'x', 3]
      } as unknown as FitsData;

      expect(() => getStats(image)).to.throw(/Non-numeric value/);
    });
  });

  describe('table data', () => {
    it('should compute statistics per column for table data', () => {
      const table: FitsData = {
        type:  'table',
        shape: [2, 2],
        keys:  ['A', 'B'],
        data:  [
          [1, 2],
          [3, 4]
        ]
      };

      const result = getStats(table);
      expect(result.keys).to.deep.equal(['', 'A', 'B']);

      const meanA = (1 + 3) / 2;
      const stdA  = Math.sqrt(((1 - meanA) ** 2 + (3 - meanA) ** 2) / 2);
      const meanB = (2 + 4) / 2;
      const stdB  = Math.sqrt(((2 - meanB) ** 2 + (4 - meanB) ** 2) / 2);

      expect(result.data[0]).to.deep.equal(['Min', 1, 2]);
      expect(result.data[1]).to.deep.equal(['Max', 3, 4]);
      expect(result.data[2][0]).to.equal('Mean');
      expect(result.data[2][1]).to.be.closeTo(meanA, 1e-4);
      expect(result.data[2][2]).to.be.closeTo(meanB, 1e-4);
      expect(result.data[3][0]).to.equal('Std Dev');
      expect(result.data[3][1]).to.be.closeTo(stdA, 1e-4);
      expect(result.data[3][2]).to.be.closeTo(stdB, 1e-4);
    });

    it('should throw if a table column contains non-numeric values', () => {
      const table: FitsData = {
        type:  'table',
        shape: [2, 2],
        keys:  ['X', 'Y'],
        data:  [
          [1, 'bad'],
          [2, 3]
        ]
      };

      expect(() => getStats(table)).to.throw('Non-numeric value encountered in data');
    });
  });
});
