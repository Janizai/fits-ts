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
  
    public get<K extends keyof FitsHeaderTypes>(key: K): FitsHeaderTypes[K] | null;
    public get(key: string): HeaderEntryValue | null;

    public get(key: string): HeaderEntryValue | null {
        const entry = this.entries[key];
        return entry == null
        ? null
        : entry.value;
    }

    public getNumber(key: string): number | null {
        const val = this.get(key);
        return typeof val === 'number' ? val : null;
    }

    public getString(key: string): string | null {
        const val = this.get(key);
        return val == null
            ? null
            : formatHeaderValue(val);
    }
  
    public getComment(key: string): string | null {
        const entry = this.entries[key];
        return entry?.comment ?? null;
    }
  
    public keys(): string[] {
          return Object.keys(this.entries);
    }

    public getEntries(): Iterable<[string, HeaderEntry]> {
        return Object.entries(this.entries);
    }
}
