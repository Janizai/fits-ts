export class Zscale {
    private readonly krej: number;
    private readonly contrast: number;
    private readonly n_samples: number;
    private readonly max_reject: number;
    private readonly min_npixels: number;
    private readonly max_iterations: number;

    constructor(
        krej: number = 2.5,
        contrast: number = 0.25,
        n_samples: number = 1000,
        max_reject: number = 0.5,
        min_npixels: number = 5,
        max_iterations: number = 5
    ) {
        this.krej = krej;
        this.contrast = contrast;
        this.n_samples = n_samples;
        this.max_reject = max_reject;
        this.min_npixels = min_npixels;
        this.max_iterations = max_iterations;
    }

     public get_limits(values: number[]): [number, number] {
        const finiteValues = values.filter(value => isFinite(value) && !isNaN(value));

        const stride = Math.max(1, Math.floor(finiteValues.length / this.n_samples));
        const samples: number[] = [];

        for (let i = 0; i < finiteValues.length && samples.length < this.n_samples; i += stride) {
            samples.push(finiteValues[i]);
        }

        samples.sort((a, b) => a - b);

        const npix: number = samples.length;

        if (npix === 0) { return [0, 0]; }
        
        let vmin = samples[0];
        let vmax = samples[npix - 1];
        
        const minpix = Math.max(this.min_npixels, Math.floor(npix * this.max_reject));

        const x = Array.from({ length: npix }, (_, i) => i);

        let ngoodpix = npix;
        let lastNgoodpix = npix + 1;
        let badpix = new Array(npix).fill(false);

        const ngrow = Math.max(1, Math.floor(0.01 * npix));
        const kernel = new Array(ngrow).fill(true);

        let fit: [number, number] = [0, 0];

        for (let iteration = 0; iteration < this.max_iterations; iteration++) {
            if (ngoodpix >= lastNgoodpix || ngoodpix < minpix) {break;}

            fit = this.linefit(x, samples, badpix);
            const fitted = x.map((xi) => fit[0] * xi + fit[1]);

            const flat = samples.map((sample, i) => sample - fitted[i]);

            const threshold = this.krej * stddev(flat, badpix);
            for (let i = 0; i < npix; i++) {
                badpix[i] = flat[i] < -threshold || flat[i] > threshold;
            }
            badpix = convolve(badpix, kernel);

            lastNgoodpix = ngoodpix;
            ngoodpix = badpix.filter(bad => !bad).length;
        }

        if (ngoodpix >= minpix) {
            let slope = fit[0];

            if (this.contrast > 0) {
                slope = slope / this.contrast;
            }

            const centerPixel = Math.floor((npix - 1) / 2);
            const median = samples[centerPixel];

            const imin = median - (centerPixel - 1) * slope;
            const imax = median + (npix - centerPixel) * slope;
            
            if (Math.abs(slope) < 1e-6 || Math.abs(imin - imax) < 1e-6) { return [vmin, vmax]; }
            
            vmin = Math.max(vmin, imin);
            vmax = Math.min(vmax, imax);
        }

        return [vmin, vmax];
    }

    private linefit(x: number[], y: number[], badpix: boolean[]): [number, number] {
        let sumx = 0;
        let sumy = 0;
        let sumxy = 0;
        let sumxx = 0;
        let count = 0;

        for (let i = 0; i < x.length; i++) {
            if (!badpix[i]) {
                sumx += x[i];
                sumy += y[i];
                sumxy += x[i] * y[i];
                sumxx += x[i] * x[i];
                count++;
            }
        }

        const delta = count * sumxx - sumx * sumx;
        if (delta === 0) { return [0, 0]; }

        const slope = (count * sumxy - sumx * sumy) / delta;
        const intercept = (sumxx * sumy - sumx * sumxy) / delta;

        return [slope, intercept];
    }
}

function stddev(data: number[], badpix: boolean[]): number {
    const values = data.filter((_, i) => !badpix[i]);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;

    return Math.sqrt(variance);
}

function convolve(badpix: boolean[], kernel: boolean[]): boolean[] {
    const result = [...badpix];
    const klen = kernel.length;

    for (let i = 0; i < badpix.length; i++) {
        if (badpix[i]) {
            for (let j = 0; j < klen; j++) {
                if (i + j < badpix.length) {
                    result[i + j] = true;
                }
            }
        }
    }

    return result;
}
