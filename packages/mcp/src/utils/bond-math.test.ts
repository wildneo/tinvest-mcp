import { describe, expect, test } from 'vitest';
import {
    calculateCurrentYield,
    calculateYtm,
    calculateYtmDetailed,
    DAYS_PER_YEAR,
    nominalToEffectiveYield,
} from './bond-math.js';

describe('DAYS_PER_YEAR', () => {
    test('equals 365.25 (accounting for leap years)', () => {
        expect(DAYS_PER_YEAR).toBe(365.25);
    });
});

describe('calculateYtm', () => {
    test('returns 0 for zero or negative years to maturity', () => {
        expect(calculateYtm({
            currentPrice: 100,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 0,
        })).toBe(0);

        expect(calculateYtm({
            currentPrice: 100,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: -1,
        })).toBe(0);
    });

    test('returns 0 for zero or negative price', () => {
        expect(calculateYtm({
            currentPrice: 0,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 5,
        })).toBe(0);

        expect(calculateYtm({
            currentPrice: -50,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 5,
        })).toBe(0);
    });

    test('returns correct YTM for bond at par', () => {
        // Bond at par (100%), coupon 10% -> YTM should be approximately 10%
        const ytm = calculateYtm({
            currentPrice: 100,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 5,
        });
        expect(ytm).toBeCloseTo(10, 1);
    });

    test('returns higher YTM for discount bond', () => {
        // Bond at 80% of par, coupon 10% -> YTM should be > 10%
        const ytm = calculateYtm({
            currentPrice: 80,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 5,
        });
        expect(ytm).toBeGreaterThan(10);
    });

    test('returns lower YTM for premium bond', () => {
        // Bond at 120% of par, coupon 10% -> YTM should be < 10%
        const ytm = calculateYtm({
            currentPrice: 120,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 5,
        });
        expect(ytm).toBeLessThan(10);
    });

    test('handles deep discount long-dated bond (OFZ-26238 scenario)', () => {
        // OFZ 26238: price ~60%, maturity ~15 years, coupon ~7%
        const ytm = calculateYtm({
            currentPrice: 59.5,
            nominal: 1000,
            couponPerYear: 70,
            yearsToMaturity: 15,
        });
        // For a deeply discounted bond, YTM should be significantly higher than coupon rate
        expect(ytm).toBeGreaterThan(12);
        expect(ytm).toBeLessThan(16);
    });

    test('handles short-term bond', () => {
        // 1 year to maturity, at par
        const ytm = calculateYtm({
            currentPrice: 100,
            nominal: 1000,
            couponPerYear: 80,
            yearsToMaturity: 1,
        });
        expect(ytm).toBeCloseTo(8, 1);
    });

    test('handles different coupons per year', () => {
        // Quarterly coupons
        const ytmQuarterly = calculateYtm({
            currentPrice: 100,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 5,
            couponsPerYear: 4,
        });
        // Annual coupons
        const ytmAnnual = calculateYtm({
            currentPrice: 100,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 5,
            couponsPerYear: 1,
        });
        // Both should be close to 10% for par bond
        expect(ytmQuarterly).toBeCloseTo(10, 1);
        expect(ytmAnnual).toBeCloseTo(10, 1);
    });

    test('handles zero coupon bond', () => {
        // Zero coupon at 50% of par, 10 years
        const ytm = calculateYtm({
            currentPrice: 50,
            nominal: 1000,
            couponPerYear: 0,
            yearsToMaturity: 10,
        });
        // Should be around 7% (rule of 72: doubling in 10 years ~ 7.2%)
        expect(ytm).toBeGreaterThan(6);
        expect(ytm).toBeLessThan(8);
    });
});

describe('calculateCurrentYield', () => {
    test('returns 0 for zero or negative price', () => {
        expect(calculateCurrentYield(0, 1000, 100)).toBe(0);
        expect(calculateCurrentYield(-50, 1000, 100)).toBe(0);
    });

    test('returns coupon rate for bond at par', () => {
        // Bond at par (100%), coupon 10% -> current yield = 10%
        const cy = calculateCurrentYield(100, 1000, 100);
        expect(cy).toBeCloseTo(10, 2);
    });

    test('returns higher yield for discount bond', () => {
        // Bond at 80% of par, coupon 10% -> current yield = 10/8 = 12.5%
        const cy = calculateCurrentYield(80, 1000, 100);
        expect(cy).toBeCloseTo(12.5, 2);
    });

    test('returns lower yield for premium bond', () => {
        // Bond at 120% of par, coupon 10% -> current yield = 10/12 = 8.33%
        const cy = calculateCurrentYield(120, 1000, 100);
        expect(cy).toBeCloseTo(8.33, 1);
    });

    test('handles different nominal values', () => {
        // Nominal 500, coupon 50 (10%), price 100%
        const cy = calculateCurrentYield(100, 500, 50);
        expect(cy).toBeCloseTo(10, 2);
    });
});

describe('nominalToEffectiveYield', () => {
    test('converts 10% nominal to ~10.25% effective for semi-annual', () => {
        // (1 + 0.05)^2 - 1 = 0.1025 = 10.25%
        const effective = nominalToEffectiveYield(10, 2);
        expect(effective).toBeCloseTo(10.25, 2);
    });

    test('converts 12% nominal to ~12.36% effective for semi-annual', () => {
        // (1 + 0.06)^2 - 1 = 0.1236 = 12.36%
        const effective = nominalToEffectiveYield(12, 2);
        expect(effective).toBeCloseTo(12.36, 2);
    });

    test('converts 10% nominal to ~10.38% effective for quarterly', () => {
        // (1 + 0.025)^4 - 1 = 0.1038 = 10.38%
        const effective = nominalToEffectiveYield(10, 4);
        expect(effective).toBeCloseTo(10.38, 2);
    });

    test('returns same value for annual coupons', () => {
        // (1 + 0.10)^1 - 1 = 0.10 = 10%
        const effective = nominalToEffectiveYield(10, 1);
        expect(effective).toBeCloseTo(10, 2);
    });
});

describe('calculateYtmDetailed', () => {
    test('returns all yield components', () => {
        const result = calculateYtmDetailed({
            currentPrice: 100,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 5,
        });

        expect(result.nominal).toBeCloseTo(10, 1);
        expect(result.perPeriod).toBeCloseTo(5, 1);
        expect(result.effective).toBeCloseTo(10.25, 1);
    });

    test('effective > nominal for discount bond', () => {
        const result = calculateYtmDetailed({
            currentPrice: 80,
            nominal: 1000,
            couponPerYear: 100,
            yearsToMaturity: 5,
        });

        expect(result.effective).toBeGreaterThan(result.nominal);
    });
});

describe('OFZ 26233 comparison with broker', () => {
    // Real data from T-Invest API (2026-02-14)
    const ofz26233 = {
        currentPrice: 59.21,
        nominal: 1000,
        couponPerYear: 60.84,
        yearsToMaturity: 9.42,
        couponsPerYear: 2,
    };

    test('calculates nominal YTM ~13%', () => {
        const ytm = calculateYtm(ofz26233);
        expect(ytm).toBeGreaterThan(12.5);
        expect(ytm).toBeLessThan(14);
        console.log(`OFZ 26233 Nominal YTM: ${ytm.toFixed(2)}%`);
    });

    test('calculates effective YTM (with reinvestment)', () => {
        const result = calculateYtmDetailed(ofz26233);
        console.log(`OFZ 26233 Comparison:`);
        console.log(`  - Nominal YTM:   ${result.nominal.toFixed(2)}%`);
        console.log(`  - Effective YTM: ${result.effective.toFixed(2)}%`);
        console.log(`  - Broker shows:  14.53%`);
        console.log(`  - Difference:    ${(14.53 - result.effective).toFixed(2)}%`);

        // Effective should be higher than nominal but still not 14.53%
        expect(result.effective).toBeGreaterThan(result.nominal);
    });
});
