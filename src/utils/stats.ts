import { FitsData } from '../interfaces'

export function getStats(data: FitsData): { keys: string[], data: (string | number)[][] } {
    if (data.data.length === 0) {
        return { keys: [], data: [] };
    }

    if (data.type !== 'image' && data.type !== 'table') {
        throw new Error(`Unsupported data type: ${data.type}`);
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

function stats(data: any[]): { mean: number, std: number, min: number, max: number } {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    const numericData = data
        .map(value => parseFloat(value))
        .filter(value => {
            if (isNaN(value)) {
                throw new Error('Non-numeric value encountered in data');
            }
            return true;
        });

    for (const floatValue of numericData) {
        if (floatValue < min) {
            min = floatValue;
        }
        if (floatValue > max) {
            max = floatValue;
        }
        sum += floatValue;
    }

    const mean = sum / data.length;

    let variance = 0;
    for (const value of data) {
        variance += (value - mean) ** 2;
    }

    const std = Math.sqrt(variance / data.length);

    return { mean, std, min, max };
}

