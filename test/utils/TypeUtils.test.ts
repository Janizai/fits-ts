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
            const result = parseFieldData(bytes, 'L', 3);
            expect(result).to.deep.equal([true, false, true]);
        });

        it('should parse 16-bit integers (I)', () => {
            // big-endian 16-bit: 0x01 0x00 = 256 decimal
            const bytes = new Uint8Array([0x01, 0x00, 0x00, 0x02]); // 256, 2
            const result = parseFieldData(bytes, 'I', 2);
            expect(result).to.deep.equal([256, 2]);
        });

        it('should parse ASCII (A) correctly', () => {
            const text = 'Hello';
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);
            const result = parseFieldData(bytes, 'A', text.length);
            expect(result).to.equal('Hello');
        });

        it('should parse 8-bit integers (B)', () => {
            const bytes = new Uint8Array([255, 128, 0]); // 255, 128, 0
            const result = parseFieldData(bytes, 'B', 3);
            expect(result).to.deep.equal([255, 128, 0]);
        });

        it('should parse 32-bit integers (J)', () => {
            const bytes = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0xFF, 0xFF, 0xFF, 0xFF]); // 256, -1
            const result = parseFieldData(bytes, 'J', 2);
            expect(result).to.deep.equal([256, -1]);
        });

        it('should parse 32-bit floats (E)', () => {
            const buffer = new ArrayBuffer(8); // two floats
            const view = new DataView(buffer);
            view.setFloat32(0, 3.14, false);    // big-endian
            view.setFloat32(4, -2.71, false);   // big-endian

            const result = parseFieldData(new Uint8Array(buffer), 'E', 2);
            expect(result[0]).to.be.closeTo(3.14, 0.01);
            expect(result[1]).to.be.closeTo(-2.71, 0.01);

        });

        it('should parse 64-bit floats (D)', () => {
            const buffer = new ArrayBuffer(16); // two doubles
            const view = new DataView(buffer);
            view.setFloat64(0, 3.14159265359, false);     // big-endian
            view.setFloat64(8, -2.71828182846, false);    // big-endian
            
            const result = parseFieldData(new Uint8Array(buffer), 'D', 2);
            expect(result).to.deep.equal([3.14159265359, -2.71828182846]);            
        });
    });
});
