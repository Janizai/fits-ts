import { expect } from 'chai';
import { describe, it } from 'mocha';
import { getTypeSize, parseFieldData } from '../../src/utils/TypeUtils';

describe('TypeUtils', () => {
    describe('getTypeSize', () => {
        it('should return the correct size for known types', () => {
            expect(getTypeSize('L')).to.equal(1);
            expect(getTypeSize('I')).to.equal(2);
            expect(getTypeSize('J')).to.equal(4);
            expect(getTypeSize('E')).to.equal(4);
            expect(getTypeSize('D')).to.equal(8);
            expect(getTypeSize('A')).to.equal(1);
        });

        it('should throw an error for unsupported types', () => {
            expect(() => getTypeSize('Z')).to.throw(/Unsupported TFORM type/);
        });
    });

    describe('parseFieldData', () => {
        it('should parse logical (L) correctly', () => {
            // 'T' (84 in ASCII), 'F' (70), random other
            const bytes = new Uint8Array([84, 70, 84]);
            const result = parseFieldData(bytes.buffer, 'L', 3);
            expect(result).to.deep.equal([true, false, true]);
        });

        it('should parse 16-bit integers (I)', () => {
            // big-endian 16-bit: 0x01 0x00 = 256 decimal
            const bytes = new Uint8Array([0x01, 0x00, 0x00, 0x02]); // 256, 2
            const result = parseFieldData(bytes.buffer, 'I', 2);
            expect(result).to.deep.equal([256, 2]);
        });

        it('should parse ASCII (A) correctly', () => {
            const text = 'Hello';
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);
            const result = parseFieldData(bytes.buffer, 'A', text.length);
            expect(result).to.equal('Hello');
        });

    //TODO Add more tests for B, J, E, D, etc.
  });
});
