const typeSizeMap: { [key: string]: number } = {
    'L': 1,
    'B': 1,
    'I': 2,
    'J': 4,
    'E': 4,
    'D': 8,
    'A': 1
};

export function getTypeSize(type: string): number {
    const size = typeSizeMap[type];
    if (size === undefined) {
        throw new Error(`Unsupported TFORM type: ${type}`);
    }
    return size;
}

export function parseFieldData(data: Uint8Array, type: string, count: number): any {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const parsers: { [key: string]: (offset: number) => any } = {
        'L': (offset: number) => data[offset] === 84,
        'B': (offset: number) => view.getUint8(offset),
        'I': (offset: number) => view.getInt16(offset, false),
        'J': (offset: number) => view.getInt32(offset, false),
        'E': (offset: number) => view.getFloat32(offset, false),
        'D': (offset: number) => view.getFloat64(offset, false),
        'A': (offset: number) => {
            const textDecoder = new TextDecoder('ascii');
            const subArray = data.slice(offset, offset + count);
            return textDecoder.decode(subArray).replace(/\0/g, '');
        }
    };

    const parser = parsers[type];
    if (!parser) {
        throw new Error(`Unsupported field type: ${type}`);
    }

    // For ASCII type, return the string directly
    if (type === 'A' || count === 1) {
        return parser(0);
    }

    const elementSize = getTypeSize(type);
    const result: any[] = [];
    for (let i = 0; i < count; i++) {
        result.push(parser(i * elementSize));
    }
    return result;
}

export function writeFieldData(value: any, type: string, count: number): ArrayBuffer {
    const size = count * getTypeSize(type);
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);

    const values = Array.isArray(value) ? value : [value];

    for (let i = 0; i < count; i++) {
        const v = values[i] ?? 0;

        switch (type) {
            case 'L': view.setUint8(i, v ? 84 : 70); break; // 'T' or 'F'
            case 'I': view.setInt16(i * 2, v, false); break;
            case 'J': view.setInt32(i * 4, v, false); break;
            case 'E': view.setFloat32(i * 4, v, false); break;
            case 'D': view.setFloat64(i * 8, v, false); break;
            case 'U': view.setUint8(i, v); break;
            case 'A': {
                const textEncoder = new TextEncoder();
                const encoded = textEncoder.encode(v.toString().padEnd(count, '\0').slice(0, count));
                new Uint8Array(buffer, i * count, encoded.length).set(encoded);
                break;
            }
            default: throw new Error(`Unsupported column type: ${type}`);
        }
    }

    return buffer;
}
