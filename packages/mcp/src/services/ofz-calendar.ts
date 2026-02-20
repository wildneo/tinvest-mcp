/**
 * OFZ Coupon Calendar service.
 * Business logic for building a portfolio of OFZ-PD bonds with monthly coupon payments.
 */
import {
    instrumentsServiceBonds,
    instrumentsServiceGetBondCoupons,
    marketDataServiceGetLastPrices,
    type V1Bond,
    type V1Coupon,
    V1InstrumentStatus,
    type V1LastPrice,
} from '@wildneo/tinvest-client';
import { addYears, differenceInDays, formatISO, getMonth, parseISO } from 'date-fns';
import { calculateCurrentYield, calculateYtmDetailed, DAYS_PER_YEAR } from '../utils/bond-math.js';
import { moneyToNumber, quotationToNumber } from '../utils/converters.js';

export type SelectionStrategy = 'max_ytm' | 'max_coupon' | 'balanced';

export type OfzCalendarParams = {
    strategy: SelectionStrategy;
    minYearsToMaturity: number;
    maxYearsToMaturity: number;
    includeSpeculative?: boolean;
};

export type OfzCalendarBond = {
    uid: string;
    ticker: string;
    name: string;
    maturityDate: string;
    price: number;
    nominal: number;
    couponPerYear: number;
    couponSingle: number;
    /** Nominal YTM (simple annual rate) */
    ytm: number;
    /** Effective YTM (with coupon reinvestment) */
    effectiveYtm: number;
    currentYield: number;
    couponMonths: number[];
    yearsToMaturity: number;
};

export type SpeculativeBond = OfzCalendarBond & {
    /** Speculative potential score: yearsToMaturity * (100 - price) */
    potential: number;
    /** Star rating based on potential score */
    potentialRating: string;
};

export type CalendarEntry = {
    month: number;
    monthName: string;
    bond: OfzCalendarBond;
    couponAmount: number;
};

export type OfzCouponCalendarResult = {
    strategy: string;
    strategyDescription: string;
    selectedBonds: OfzCalendarBond[];
    calendar: CalendarEntry[];
    totalCost: number;
    /** Average nominal YTM */
    averageYtm: number;
    /** Average effective YTM (with coupon reinvestment) */
    averageEffectiveYtm: number;
    averageCurrentYield: number;
    annualCouponIncome: number;
    generatedAt: string;
    /** Speculative bonds for rate cut play (optional) */
    speculativeBonds?: SpeculativeBond[];
};

const MONTH_NAMES = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
];

const STRATEGY_DESCRIPTIONS: Record<SelectionStrategy, string> = {
    max_ytm: 'Максимальная доходность к погашению (YTM)',
    max_coupon: 'Максимальный купонный доход',
    balanced: 'Сбалансированная стратегия (YTM + текущая доходность)',
};

/**
 * Month pairs for OFZ-PD bonds (each bond pays 2 coupons per year, 6 months apart).
 * To cover all 12 months, we need 6 bonds with different coupon schedules.
 */
const MONTH_PAIRS: [number, number][] = [
    [1, 7],
    [2, 8],
    [3, 9],
    [4, 10],
    [5, 11],
    [6, 12],
];

/**
 * Check if a bond is OFZ-PD (fixed coupon federal loan bond).
 *
 * OFZ-PD criteria:
 * - Ticker starts with "SU" (Russian OFZ identifier)
 * - Government sector
 * - Exactly 2 coupons per year (semi-annual)
 * - Fixed coupon (not floating)
 * - Not perpetual
 * - No amortization
 */
export function isOfzPd(bond: V1Bond): boolean {
    if (!bond.ticker?.startsWith('SU')) return false;
    if (bond.sector !== 'government') return false;
    if (bond.couponQuantityPerYear !== 2) return false;
    if (bond.floatingCouponFlag) return false;
    if (bond.amortizationFlag) return false;
    if (bond.perpetualFlag) return false;

    return true;
}

/**
 * Extract unique coupon months (1-12) from coupon schedule.
 */
export function getCouponMonths(coupons: V1Coupon[]): number[] {
    const months = new Set<number>();
    for (const c of coupons) {
        if (c.couponDate) {
            const month = getMonth(parseISO(c.couponDate)) + 1; // date-fns returns 0-11
            months.add(month);
        }
    }
    return Array.from(months).sort((a, b) => a - b);
}

/**
 * Create a key for month pair (e.g., "1-7" for Jan-Jul).
 */
function getMonthPairKey(months: number[]): string {
    return [...months].sort((a, b) => a - b).join('-');
}

/**
 * Group bonds by their coupon month pairs.
 */
export function groupBondsByMonthPairs(bonds: OfzCalendarBond[]): Map<string, OfzCalendarBond[]> {
    const bondsByPair = new Map<string, OfzCalendarBond[]>();

    for (const bond of bonds) {
        const pairKey = getMonthPairKey(bond.couponMonths);
        const existing = bondsByPair.get(pairKey) ?? [];
        existing.push(bond);
        bondsByPair.set(pairKey, existing);
    }

    return bondsByPair;
}

/**
 * Select best bond for each month pair based on strategy.
 */
export function selectBondsByStrategy(
    bondsByPair: Map<string, OfzCalendarBond[]>,
    strategy: SelectionStrategy,
): OfzCalendarBond[] {
    const selectedBonds: OfzCalendarBond[] = [];

    for (const [m1, m2] of MONTH_PAIRS) {
        const pairKey = `${m1}-${m2}`;
        const candidates = bondsByPair.get(pairKey) ?? [];

        if (candidates.length === 0) continue;

        const sorted = sortBondsByStrategy(candidates, strategy);
        selectedBonds.push(sorted[0]);
    }

    return selectedBonds;
}

/**
 * Sort bonds according to the selection strategy.
 */
function sortBondsByStrategy(
    bonds: OfzCalendarBond[],
    strategy: SelectionStrategy,
): OfzCalendarBond[] {
    switch (strategy) {
        case 'max_ytm':
            return [...bonds].sort((a, b) => b.ytm - a.ytm);
        case 'max_coupon':
            return [...bonds].sort((a, b) => b.couponSingle - a.couponSingle);
        case 'balanced':
            // Combined score: YTM + current yield
            return [...bonds].sort((a, b) => b.ytm + b.currentYield - (a.ytm + a.currentYield));
    }
}

/**
 * Get star rating for speculative potential score.
 */
function getPotentialRating(potential: number): string {
    if (potential >= 600) return '★★★★★';
    if (potential >= 450) return '★★★★☆';
    if (potential >= 300) return '★★★☆☆';
    if (potential >= 150) return '★★☆☆☆';
    return '★☆☆☆☆';
}

/**
 * Select speculative bonds for rate cut play.
 *
 * Criteria:
 * - High duration: yearsToMaturity >= 8
 * - Deep discount: price <= 75% of nominal
 * - Sorted by potential = yearsToMaturity * (100 - price)
 */
function selectSpeculativeBonds(bonds: OfzCalendarBond[], limit: number = 3): SpeculativeBond[] {
    const MIN_YEARS = 8;
    const MAX_PRICE = 75;

    return bonds
        .filter((b) => b.yearsToMaturity >= MIN_YEARS && b.price <= MAX_PRICE)
        .map((b) => {
            const potential = b.yearsToMaturity * (100 - b.price);
            return {
                ...b,
                potential,
                potentialRating: getPotentialRating(potential),
            };
        })
        .sort((a, b) => b.potential - a.potential)
        .slice(0, limit);
}

/**
 * Enrich bond with market data and calculations.
 * Returns null if required data is missing.
 */
function enrichBondWithMarketData(
    bond: V1Bond,
    priceMap: Map<string, number>,
    couponMap: Map<string, V1Coupon[]>,
    now: Date,
): OfzCalendarBond | null {
    const uid = bond.uid;
    if (!uid || !bond.maturityDate) return null;

    const price = priceMap.get(uid);
    const coupons = couponMap.get(uid) ?? [];

    if (!price || coupons.length === 0) return null;

    const nominal = moneyToNumber(bond.nominal);
    if (nominal <= 0) return null;

    const couponSingle = moneyToNumber(coupons[0]?.payOneBond);
    const couponsPerYear = bond.couponQuantityPerYear ?? 2;
    const couponPerYear = couponSingle * couponsPerYear;
    const couponMonths = getCouponMonths(coupons);

    // OFZ-PD should have exactly 2 coupon months
    if (couponMonths.length !== 2) return null;

    const maturityDate = parseISO(bond.maturityDate);
    const yearsToMaturity = differenceInDays(maturityDate, now) / DAYS_PER_YEAR;

    const ytmResult = calculateYtmDetailed({
        currentPrice: price,
        nominal,
        couponPerYear,
        yearsToMaturity,
        couponsPerYear,
    });
    const currentYield = calculateCurrentYield(price, nominal, couponPerYear);

    return {
        uid,
        ticker: bond.ticker ?? '',
        name: bond.name ?? '',
        maturityDate: bond.maturityDate,
        price,
        nominal,
        couponPerYear,
        couponSingle,
        ytm: ytmResult.nominal,
        effectiveYtm: ytmResult.effective,
        currentYield,
        couponMonths,
        yearsToMaturity,
    };
}

/**
 * Build coupon calendar entries from selected bonds.
 */
function buildCalendarEntries(bonds: OfzCalendarBond[]): CalendarEntry[] {
    return bonds
        .flatMap((bond) =>
            bond.couponMonths.map((month) => ({
                month,
                monthName: MONTH_NAMES[month - 1],
                bond,
                couponAmount: bond.couponSingle,
            })),
        )
        .sort((a, b) => a.month - b.month);
}

/**
 * Calculate portfolio summary statistics.
 */
function calculatePortfolioSummary(bonds: OfzCalendarBond[]) {
    const totalCost = bonds.reduce((sum, b) => sum + (b.price / 100) * b.nominal, 0);
    const averageYtm = bonds.reduce((sum, b) => sum + b.ytm, 0) / bonds.length;
    const averageEffectiveYtm = bonds.reduce((sum, b) => sum + b.effectiveYtm, 0) / bonds.length;
    const averageCurrentYield = bonds.reduce((sum, b) => sum + b.currentYield, 0) / bonds.length;
    const annualCouponIncome = bonds.reduce((sum, b) => sum + b.couponPerYear, 0);

    return { totalCost, averageYtm, averageEffectiveYtm, averageCurrentYield, annualCouponIncome };
}

/**
 * Fetch coupons for multiple bonds in parallel.
 */
async function fetchCouponsForBonds(bonds: V1Bond[], now: Date) {
    const entries = await Promise.all(
        bonds
            .filter((bond): bond is V1Bond & { uid: string } => Boolean(bond.uid))
            .map(async ({ uid: instrumentId }): Promise<[string, V1Coupon[]]> => {
                try {
                    const {
                        data: { events = [] },
                    } = await instrumentsServiceGetBondCoupons({
                        body: {
                            instrumentId,
                            from: formatISO(now),
                            to: formatISO(addYears(now, 2)),
                        },
                    });
                    return [instrumentId, events ?? []];
                } catch {
                    return [instrumentId, []];
                }
            }),
    );

    return new Map(entries);
}

/**
 * Build complete OFZ coupon calendar.
 *
 * @param params - Calendar parameters (strategy, maturity range)
 * @returns Calendar result or null if no suitable bonds found
 */
export async function buildOfzCouponCalendar(
    params: OfzCalendarParams,
): Promise<OfzCouponCalendarResult | null> {
    const { strategy, minYearsToMaturity, maxYearsToMaturity, includeSpeculative } = params;
    const now = new Date();

    // 1. Fetch all bonds
    const { data: bondsData } = await instrumentsServiceBonds({
        body: { instrumentStatus: V1InstrumentStatus.INSTRUMENT_STATUS_BASE },
    });

    const allBonds = bondsData.instruments ?? [];

    // 2. Filter all OFZ-PD bonds with minimum maturity (no upper limit for speculative analysis)
    const allOfzBonds = allBonds.filter((bond) => {
        if (!isOfzPd(bond)) return false;
        if (!bond.maturityDate || !bond.uid) return false;

        const maturityDate = parseISO(bond.maturityDate);
        const yearsToMaturity = differenceInDays(maturityDate, now) / DAYS_PER_YEAR;

        return yearsToMaturity >= minYearsToMaturity;
    });

    // 3. Filter for calendar: apply maxYearsToMaturity limit
    const ofzBonds = allOfzBonds.filter((bond) => {
        if (!bond.maturityDate) return false;

        const maturityDate = parseISO(bond.maturityDate);
        const yearsToMaturity = differenceInDays(maturityDate, now) / DAYS_PER_YEAR;

        return yearsToMaturity <= maxYearsToMaturity;
    });

    if (ofzBonds.length === 0) return null;

    // 4. Fetch prices for all OFZ bonds (including long-term for speculative)
    const bondsForPrices = includeSpeculative ? allOfzBonds : ofzBonds;
    const instrumentId = bondsForPrices.reduce<string[]>(
        (acc, b) => (b.uid ? acc.concat(b.uid) : acc),
        [],
    );

    const entries = await marketDataServiceGetLastPrices({ body: { instrumentId } }).then(
        ({ data: { lastPrices = [] } }) =>
            lastPrices
                .filter((lp): lp is V1LastPrice & { instrumentUid: string } =>
                    Boolean(lp.instrumentUid),
                )
                .map((lp) => [lp.instrumentUid, quotationToNumber(lp.price)] as const),
    );
    const priceMap = new Map<string, number>(entries);

    // 5. Fetch coupons in parallel
    const couponMap = await fetchCouponsForBonds(bondsForPrices, now);

    // 6. Enrich calendar bonds with market data
    const bondsWithData = ofzBonds
        .map((bond) => enrichBondWithMarketData(bond, priceMap, couponMap, now))
        .filter((b): b is OfzCalendarBond => b !== null);

    // 7. Group by month pairs and select best bonds
    const bondsByPair = groupBondsByMonthPairs(bondsWithData);
    const selectedBonds = selectBondsByStrategy(bondsByPair, strategy);

    if (selectedBonds.length === 0) return null;

    // 8. Build calendar and summary
    const calendar = buildCalendarEntries(selectedBonds);
    const summary = calculatePortfolioSummary(selectedBonds);

    // 9. Select speculative bonds (from all OFZ bonds, including long-term)
    let speculativeBonds: SpeculativeBond[] | undefined;
    if (includeSpeculative) {
        const allBondsWithData = allOfzBonds
            .map((bond) => enrichBondWithMarketData(bond, priceMap, couponMap, now))
            .filter((b): b is OfzCalendarBond => b !== null);
        speculativeBonds = selectSpeculativeBonds(allBondsWithData);
    }

    return {
        strategy,
        strategyDescription: STRATEGY_DESCRIPTIONS[strategy],
        selectedBonds: selectedBonds.sort((a, b) => a.couponMonths[0] - b.couponMonths[0]),
        calendar,
        ...summary,
        generatedAt: now.toISOString(),
        speculativeBonds,
    };
}
