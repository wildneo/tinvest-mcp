/**
 * Bond mathematics utilities.
 * Contains functions for calculating YTM (Yield to Maturity) and current yield.
 */

/** Average number of days per year accounting for leap years (365 + 1/4) */
export const DAYS_PER_YEAR = 365.25;

export type YtmParams = {
    /** Current price as percent of nominal (e.g., 59.5 means 59.5% of face value) */
    currentPrice: number;
    /** Face value (nominal) in currency units */
    nominal: number;
    /** Annual coupon payment in currency units */
    couponPerYear: number;
    /** Years remaining until maturity */
    yearsToMaturity: number;
    /** Number of coupon payments per year (default: 2 for semi-annual) */
    couponsPerYear?: number;
};

/**
 * Calculate YTM (Yield to Maturity) using Newton-Raphson method (IRR-based).
 *
 * This method finds the discount rate that makes NPV of all cash flows equal to current price.
 * More accurate than simple approximation formulas, especially for:
 * - Long-dated bonds
 * - Bonds trading at deep discounts or premiums
 *
 * @returns Annual YTM as a percentage (e.g., 12.5 for 12.5%)
 */
export function calculateYtm(params: YtmParams): number {
    const { currentPrice, nominal, couponPerYear, yearsToMaturity, couponsPerYear = 2 } = params;

    if (yearsToMaturity <= 0 || currentPrice <= 0) return 0;

    const priceInCurrency = (currentPrice / 100) * nominal;
    const couponPerPeriod = couponPerYear / couponsPerYear;
    const periodsRemaining = Math.round(yearsToMaturity * couponsPerYear);

    if (periodsRemaining <= 0) return 0;

    /**
     * NPV function: calculates present value of all cash flows minus current price.
     * When NPV = 0, we have found the correct yield.
     */
    const npv = (yieldPerPeriod: number): number => {
        let pv = 0;
        for (let i = 1; i <= periodsRemaining; i++) {
            pv += couponPerPeriod / (1 + yieldPerPeriod) ** i;
        }
        pv += nominal / (1 + yieldPerPeriod) ** periodsRemaining;
        return pv - priceInCurrency;
    };

    /**
     * Derivative of NPV function for Newton-Raphson iteration.
     */
    const npvDerivative = (yieldPerPeriod: number): number => {
        let derivative = 0;
        for (let i = 1; i <= periodsRemaining; i++) {
            derivative -= (i * couponPerPeriod) / (1 + yieldPerPeriod) ** (i + 1);
        }
        derivative -= (periodsRemaining * nominal) / (1 + yieldPerPeriod) ** (periodsRemaining + 1);
        return derivative;
    };

    // Initial guess: simple yield estimate
    let yieldGuess =
        couponPerPeriod / priceInCurrency +
        (nominal - priceInCurrency) / periodsRemaining / priceInCurrency;

    const maxIterations = 100;
    const tolerance = 1e-10;

    for (let i = 0; i < maxIterations; i++) {
        const npvValue = npv(yieldGuess);
        const derivativeValue = npvDerivative(yieldGuess);

        if (Math.abs(derivativeValue) < 1e-15) break;

        const newYield = yieldGuess - npvValue / derivativeValue;

        if (Math.abs(newYield - yieldGuess) < tolerance) {
            yieldGuess = newYield;
            break;
        }

        yieldGuess = newYield;

        // Prevent negative or extreme yields
        if (yieldGuess < 0) yieldGuess = 0.001;
        if (yieldGuess > 1) yieldGuess = 0.5;
    }

    // Convert per-period yield to annual yield (percentage)
    return yieldGuess * couponsPerYear * 100;
}

/**
 * Calculate current yield (annual coupon / current price).
 *
 * Current yield shows the return from coupon payments alone,
 * without considering capital gains/losses at maturity.
 *
 * @param currentPrice - Current price as percent of nominal (e.g., 95.5)
 * @param nominal - Face value in currency units
 * @param couponPerYear - Annual coupon payment in currency units
 * @returns Current yield as a percentage (e.g., 10.5 for 10.5%)
 */
export function calculateCurrentYield(
    currentPrice: number,
    nominal: number,
    couponPerYear: number,
): number {
    if (currentPrice <= 0) return 0;
    const priceInCurrency = (currentPrice / 100) * nominal;
    return (couponPerYear / priceInCurrency) * 100;
}

/**
 * Convert nominal (simple) annual yield to effective annual yield.
 *
 * Effective yield accounts for compounding of coupon reinvestment.
 * Formula: EAY = (1 + r/n)^n - 1, where r is nominal rate, n is periods per year.
 *
 * @param nominalYtm - Nominal YTM as percentage (e.g., 13.09)
 * @param couponsPerYear - Number of coupon payments per year (default: 2)
 * @returns Effective annual yield as percentage (e.g., 13.52)
 */
export function nominalToEffectiveYield(nominalYtm: number, couponsPerYear: number = 2): number {
    const ratePerPeriod = nominalYtm / 100 / couponsPerYear;
    const effectiveRate = (1 + ratePerPeriod) ** couponsPerYear - 1;

    return effectiveRate * 100;
}

export type YtmResult = {
    /** Nominal (simple) YTM - sum of periodic rates */
    nominal: number;
    /** Effective YTM - with compounding */
    effective: number;
    /** Yield per coupon period */
    perPeriod: number;
};

/**
 * Calculate both nominal and effective YTM.
 *
 * @returns Object with nominal, effective, and per-period yields (all as percentages)
 */
export function calculateYtmDetailed(params: YtmParams): YtmResult {
    const { couponsPerYear = 2 } = params;
    const nominal = calculateYtm(params);
    const effective = nominalToEffectiveYield(nominal, couponsPerYear);
    const perPeriod = nominal / couponsPerYear;

    return { nominal, effective, perPeriod };
}
