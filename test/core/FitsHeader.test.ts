import { expect } from 'chai';
import { describe, it } from 'mocha';

import { FitsHeader } from '../../src/core/FitsHeader';

describe('FitsHeader', () => {
    it('should initialize with no entries if no arguments are provided', () => {
        const header = new FitsHeader();
        expect(header.keys()).to.deep.equal([]);
    });

    it('should initialize with provided entries', () => {
        const entries = {
            SIMPLE: true,
            BITPIX: { value: 8, comment: 'Number of bits per data pixel' },
        };
        const header = new FitsHeader(entries);

        expect(header.get('SIMPLE')).to.equal(true);
        expect(header.get('BITPIX')).to.equal(8);
        expect(header.getComment('BITPIX')).to.equal('Number of bits per data pixel');
    });

    it('should allow setting a new entry with a value and comment', () => {
        const header = new FitsHeader();
        header.set('NAXIS', 2, 'Number of axes');

        expect(header.get('NAXIS')).to.equal(2);
        expect(header.getComment('NAXIS')).to.equal('Number of axes');
    });

    it('should overwrite an existing entry when setting the same key', () => {
        const header = new FitsHeader();
        header.set('NAXIS', 2, 'Number of axes');
        header.set('NAXIS', 3, 'Updated number of axes');

        expect(header.get('NAXIS')).to.equal(3);
        expect(header.getComment('NAXIS')).to.equal('Updated number of axes');
    });

    it('should throw an error for non-existent keys', () => {
        const header = new FitsHeader();
        expect(() => header.get('NON_EXISTENT')).to.throw('Key "NON_EXISTENT" not found in header.');
        expect(() => header.getComment('NON_EXISTENT')).to.throw('Key "NON_EXISTENT" not found in header.');
    });

    it('should return all keys in the header', () => {
        const header = new FitsHeader();
        header.set('SIMPLE', 'T');
        header.set('BITPIX', '8');

        expect(header.keys()).to.deep.equal(['SIMPLE', 'BITPIX']);
    });

    it('should handle entries with no comments', () => {
        const header = new FitsHeader();
        header.set('SIMPLE', true);

        expect(header.get('SIMPLE')).to.equal(true);
        expect(header.getComment('SIMPLE')).to.equal(undefined);
    });

    it('should handle initialization with mixed string and object entries', () => {
        const entries = {
            SIMPLE: true,
            BITPIX: { value: 8, comment: 'Number of bits per data pixel' },
        };
        const header = new FitsHeader(entries);

        expect(header.get('SIMPLE')).to.equal(true);
        expect(header.get('BITPIX')).to.equal(8);
        expect(header.getComment('BITPIX')).to.equal('Number of bits per data pixel');
    });
});