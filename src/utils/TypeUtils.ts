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

export function parseFieldData(data: ArrayBuffer, type: string, count: number): any {
    const view = new DataView(data);
    const parsers: { [key: string]: (offset: number) => any } = {
        'L': (offset: number) => {
            const byte = new Uint8Array(data, offset, 1)[0];
            return byte === 84; // ASCII 'T' equals true
        },
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
    if (type === 'A') {
        return parser(0);
    }

    const elementSize = getTypeSize(type);
    const result: any[] = [];
    for (let i = 0; i < count; i++) {
        result.push(parser(i * elementSize));
    }
    return result;
}
