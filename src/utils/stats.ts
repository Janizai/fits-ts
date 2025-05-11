import { FitsData } from '../interfaces'

export function getStats(data: FitsData): { keys: string[], data: (string | number)[][] } {
    if (!data.data || data.data.length === 0) {
        return { keys: [], data: [] };
    }

    if (data.type !== 'image' && data.type !== 'table') {
        throw new Error('Unsupported data type');
    }

    if (data.type === 'image') {
        const imageStats = stats(data.data);
        return {
            keys: ['', 'Image Data'],
            data: [
                ['Min', imageStats.min],
                ['Max', imageStats.max],
                ['Mean', imageStats.mean],
                ['Std Dev', imageStats.std]
            ]
        };
    }

    const keys = data.keys;

    const tableStats = keys.map((key, col) => {
        const colData = data.data.map((row) => row[col]);
        const colStats = stats(colData);

        return {
            col: key,
            min: colStats.min,
            max: colStats.max,
            mean: colStats.mean,
            stdDev: colStats.std
        };
    });

    const new_keys: string[] = ['', ...keys];
    return {
        keys: new_keys,
        data: [
            ['Min', ...tableStats.map(stat => stat.min)],
            ['Max', ...tableStats.map(stat => stat.max)],
            ['Mean', ...tableStats.map(stat => stat.mean)],
            ['Std Dev', ...tableStats.map(stat => stat.stdDev)]
        ]
    };
}

function stats(values: Iterable<number>): { mean: number, std: number, min: number, max: number } {
    const arr = Array.from(values).filter(v => {
        if (!isFinite(v) || isNaN(v)) {
            throw new Error('Non-numeric value encountered in data');
        }
        return true;
    });

    const n = arr.length;
    if (n === 0) {
        return { mean: 0, std: 0, min: 0, max: 0 };
    }

    let sum = 0;
    let min = Infinity, max = -Infinity;
    for (const v of arr) {
        sum += v;
        min = Math.min(min, v);
        max = Math.max(max, v);
    }
    const mean = sum / n;

    let variance = 0;
    for (const v of arr) {
        variance += (v - mean) ** 2;
    }
    const std = Math.sqrt(variance / n);

    return { mean, std, min, max };
}
