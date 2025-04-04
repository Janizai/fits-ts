import { expect } from 'chai';
import { Zscale } from '../../src/utils/Zscale';

describe('Zscale', () => {
    describe('get_limits', () => {
        it('should return [0, 0] for an empty array', () => {
            const zscale = new Zscale();
            const result = zscale.get_limits([]);
            expect(result).to.deep.equal([0, 0]);
        });

        it('should return the min and max for a simple array', () => {
            const zscale = new Zscale();
            const result = zscale.get_limits([1, 2, 3, 4, 5]);
            expect(result).to.deep.equal([1, 5]);
        });

        it('should ignore NaN and Infinity values', () => {
            const zscale = new Zscale();
            const result = zscale.get_limits([1, 2, NaN, Infinity, 3, 4, 5]);
            expect(result).to.deep.equal([1, 5]);
        });

        it('should handle a single value array', () => {
            const zscale = new Zscale();
            const result = zscale.get_limits([42]);
            expect(result).to.deep.equal([42, 42]);
        });

        it('should respect the contrast parameter', () => {
            const zscale = new Zscale(2.5, 0.5);
            const result = zscale.get_limits([1, 2, 3, 4, 5]);
            expect(result[0]).to.be.at.least(1);
            expect(result[1]).to.be.at.most(5);
        });

        it('should return adjusted limits for a large array', () => {
            const zscale = new Zscale();
            const values = Array.from({ length: 100 }, (_, i) => i + 1);
            const result = zscale.get_limits(values);
            expect(result[0]).to.be.at.least(1);
            expect(result[1]).to.be.at.most(100);
        });

        it('should handle arrays with repeated values', () => {
            const zscale = new Zscale();
            const result = zscale.get_limits([5, 5, 5, 5, 5]);
            expect(result).to.deep.equal([5, 5]);
        });

        it('should handle arrays with negative values', () => {
            const zscale = new Zscale();
            const result = zscale.get_limits([-10, -5, 0, 5, 10]);
            expect(result).to.deep.equal([-10, 10]);
        });

        it('should handle arrays with all identical values', () => {
            const zscale = new Zscale();
            const result = zscale.get_limits([7, 7, 7, 7]);
            expect(result).to.deep.equal([7, 7]);
        });

        it('should return adjusted limits for noisy data', () => {
            const zscale = new Zscale();
            const values = [1, 2, 3, 100, 101, 102];
            const result = zscale.get_limits(values);
            expect(result[0]).to.be.at.least(1);
            expect(result[1]).to.be.at.most(102);
        });
    });
});