import { FitsHeaderTypes, HeaderEntryValue } from '../schema/fits-schema';
import { formatHeaderValue } from '../schema/fits-utils';

type HeaderEntry = {
    value: HeaderEntryValue;
    comment?: string;
}

export class FitsHeader {
    private entries: Record<string, HeaderEntry>;
  
    constructor(
        entries?: Record<
            string,
            HeaderEntryValue | { value: HeaderEntryValue; comment?: string }
        >
    ) {
        if (entries) {
            this.entries = {};
            for (const key in entries) {
                const entry = entries[key];
                if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
                    this.set(key, entry);
                } else {
                    this.set(key, entry.value, entry.comment);
                }
            }
        } else {
            this.entries = {};
        }
    }
  
    public has(key: string): boolean {
        return key in this.entries;
    }

    public remove(key: string): void {
        if (!this.entries[key]) {
            throw new Error(`Key "${key}" not found in header.`);
        }
        delete this.entries[key];
    }

    public set(key: string, value: HeaderEntryValue, comment?: string): void {
        this.entries[key] = {
            value,
            comment,
        };
    }
  
    public get<K extends keyof FitsHeaderTypes>(key: K): FitsHeaderTypes[K] | undefined;
    public get(key: string): HeaderEntryValue | undefined;
    public get(key: string): HeaderEntryValue | undefined {
        if (!this.entries[key]) {
            throw new Error(`Key "${key}" not found in header.`);
        }
        return this.entries[key].value;
    }

    public getNumber(key: string): number | undefined {
        if (!this.entries[key]) {
            throw new Error(`Key "${key}" not found in header.`);
        }
        const value = this.entries[key].value;
        if (typeof value !== 'number') {
            throw new Error(`Value for key "${key}" is not a number.`);
        }
        return value;
    }

    public getString(key: string): string | undefined {
        if (!this.entries[key]) {
            throw new Error(`Key "${key}" not found in header.`);
        }
        const value = this.entries[key].value;
        return formatHeaderValue(value);
    }
  
    public getComment(key: string): string | undefined {
        if (!this.entries[key]) {
            throw new Error(`Key "${key}" not found in header.`);
        }
        return this.entries[key].comment;
    }
  
    public keys(): string[] {
          return Object.keys(this.entries);
    }

    public getEntries(): Iterable<[string, HeaderEntry]> {
        return Object.entries(this.entries);
    }
}
