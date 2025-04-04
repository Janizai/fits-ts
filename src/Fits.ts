import { FitsReader, FitsWriter } from './io/FitsIO';
import { FitsFileSource } from './io/FileReader';
import { FitsData, FitsHDU } from './interfaces';
import { FitsHeader } from './core/FitsHeader';

import { promises as fs } from 'fs';

export class Fits {
    private hdus: FitsHDU[] = [];
    private reader?: FitsReader;

    private loadPromise?: Promise<void>;
    private loaded = false;

    constructor(source?: FitsFileSource) {
        if (source) {
            this.reader = new FitsReader(source);
        }
    }

    public async load(): Promise<void> {
        if (this.loaded) return;
        if (!this.reader) return;
    
        if (!this.loadPromise) {
            this.loadPromise = (async () => {
                await this.reader!.parseHeaders();
                this.hdus = this.reader!.hduMetadata;
                this.loaded = true;
            })();
        }
    
        return this.loadPromise;
    }

    public get length(): number {
        return this.hdus.length;
    }

    public getHDU(index: number): FitsHDU {
        if (index < 0 || index >= this.hdus.length) {
            throw new Error(`Invalid HDU index: ${index}`);
        }
        return this.hdus[index];
    }

    public getHeader(index: number): FitsHeader {
        return this.getHDU(index).header;
    }

    public async getData(index: number): Promise<FitsData> {
        const hdu = this.getHDU(index);

        if (hdu.data) {
            return hdu.data;
        }

        if (this.reader) {
            const data = await this.reader.getData(index);

            hdu.data = data;
            return data;
        }

        throw new Error(`No data available for HDU index: ${index}`);
    }

    public addHDU(header: FitsHeader | undefined, data: FitsData): void {
        // Create a minimal header if not provided
        const hdr = header ?? new FitsHeader();
    
        // Add or correct required keywords depending on the type
        hdr.set('SIMPLE', true); // Assume primary HDU for simplicity
    
        if (data.type === 'image') {
            const [rows, columns] = data.shape.length === 2 ? data.shape : [1, data.shape[0] ?? 1];
            hdr.set('BITPIX', 16); // Assume 16-bit image if user didn't set it
            hdr.set('NAXIS', 2);
            hdr.set('NAXIS1', columns);
            hdr.set('NAXIS2', rows);
        }
    
        if (data.type === 'table') {
            const [rows, columns] = data.shape;
            hdr.set('XTENSION', 'BINTABLE'); // Required for tables (if not primary)
            hdr.set('BITPIX', 8);
            hdr.set('NAXIS', 2);
            hdr.set('NAXIS1', data.keys.length > 0 ? 1 : 0);
            hdr.set('NAXIS2', rows);
            hdr.set('PCOUNT', 0); // Standard for BINTABLE
            hdr.set('GCOUNT', 1);
            hdr.set('TFIELDS', columns);
    
            // Add default TTYPE/TFORM headers if not present
            for (let i = 0; i < columns; i++) {
                const ttypeKey = `TTYPE${i + 1}`;
                const tformKey = `TFORM${i + 1}`;
                if (!hdr.has(ttypeKey)) {
                    hdr.set(ttypeKey, data.keys[i] ?? `COL_${i + 1}`);
                }
                if (!hdr.has(tformKey)) {
                    // Default to 1J (32-bit int) if we can’t infer; this is safest fallback
                    hdr.set(tformKey, '1J');
                }
            }
        }
    
        this.hdus.push({
            header: hdr,
            data,
            shape: data.shape,
            type: data.type,
        });
    }    

    public setHDU(index: number, header: FitsHeader, data: FitsData): void {
        if (index < 0 || index >= this.hdus.length) {
            throw new Error(`Invalid HDU index: ${index}`);
        }
        this.hdus[index] = { header, data, shape: data.shape, type: data.type };
    }

    public deleteHDU(index: number): void {
        if (index < 0 || index >= this.hdus.length) {
            throw new Error(`Invalid HDU index: ${index}`);
        }
        this.hdus.splice(index, 1);
    }

    public async *entries(): AsyncIterableIterator<{ index: number; header: FitsHeader; data: FitsData }> {
        for (let i = 0; i < this.hdus.length; i++) {
            const header = this.hdus[i].header;
            const data = this.hdus[i].data || await this.getData(i);
            yield { index: i, header, data };
        }
    }

    public async entriesArray(): Promise<{ index: number; header: FitsHeader; data: FitsData }[]> {
        const result = [];
        for await (const entry of this.entries()) {
            result.push(entry);
        }
        return result;
    }

    public async toBytes(): Promise<Uint8Array> {
        const writer = new FitsWriter();
        for (let i = 0; i < this.hdus.length; i++) {
            const header = this.hdus[i].header;
            const data = this.hdus[i].data || await this.getData(i);

            writer.addHDU(header, data);
        }
        return writer.write()
    }

    public async toBuffer(): Promise<Buffer> {
        const bytes = await this.toBytes();
        return Buffer.from(bytes);
    }    

    public async saveToFile(path: string): Promise<void> {
        const buffer = await this.toBuffer();
        await fs.writeFile(path, buffer);
    }

    public clear(): void {
        this.hdus = [];
        this.reader = undefined;
        this.loaded = false;
        this.loadPromise = undefined;
    }
}
