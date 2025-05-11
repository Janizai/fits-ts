import { HeaderEntryValue } from './fits-schema';

export function parseHeaderValue(value: string): HeaderEntryValue {
    const trimmed = value.trim();

    if (trimmed === 'T') return true;
    if (trimmed === 'F') return false;

    const number = Number(trimmed);
    if (!Number.isNaN(number)) return number;

    if (trimmed.startsWith(`'`) && trimmed.endsWith(`'`)) {
        return trimmed.slice(1, -1).trim();
    }

    return trimmed;
}

export function formatHeaderValue(value: HeaderEntryValue): string {
    if (typeof value === 'boolean') {
        return value ? 'T' : 'F';
    } else if (typeof value === 'number') {
        return value.toString();
    } else {
        // Escape single quotes by doubling them
        const escaped = value.replace(/'/g, "''");
        return `'${escaped}'`;
    }
}

export function parseHeaderLine(line: string): { key: string; value?: HeaderEntryValue; comment?: string } | null {
    const key = line.slice(0, 8).trim();
    if (!key || key === 'END') return null;

    const hasEquals = line[8] === '=';

    if (!hasEquals) {
        // COMMENT and HISTORY lines may not have '='
        return { key, value: undefined, comment: line.slice(8).trim() };
    }

    const content = line.slice(10); // skip = and space
    let rawValue = '';
    let comment = '';

    if (content.startsWith(`'`)) {
        // Handle quoted string value — FITS can include slashes in quoted strings
        const regex = /^'([^']*)'\s*(?:\/(.*))?$/;
        const match = regex.exec(content);
        if (match) {
            rawValue = `'${match[1]}'`;
            comment = match[2]?.trim() || '';
        } else {
            rawValue = content.trim();
        }
    } else {
        // Unquoted value — split at first slash
        const split = content.split('/');
        rawValue = split[0].trim();
        comment = split.slice(1).join('/').trim(); // preserve slashes in comment
    }

    return {
        key,
        value: parseHeaderValue(rawValue),
        comment,
    };
}

export function formatHeaderLine(key: string, value: HeaderEntryValue, comment?: string): string {
    // Begin with 8-char key, '=' and a space
    let line = key.padEnd(8, ' ') + '= ';

    let formattedValue = formatHeaderValue(value);

    // For numbers, FITS expects right-alignment within 20 chars
    // For strings and booleans, left-align (though usually fits)
    const isNumeric = typeof value === 'number';
    const paddedValue = isNumeric
        ? formattedValue.padStart(20, ' ')
        : formattedValue.padEnd(20, ' ');

    // Pad to 30 columns of value field total
    line += paddedValue + ' ';

    // If there's a comment, add ' / ' and the comment
    if (comment) {
        const commentStr = '/ ' + comment;
        line += commentStr;
    }

    // Pad to 80 chars total
    return line.padEnd(80, ' ');
}
