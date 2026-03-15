import { describe, expect, test } from 'vitest';
import type { V1MoneyValue, V1OperationItem, V1PortfolioPosition, V1PortfolioResponse } from '@wildneo/tinvest-client';
import {
    aggregateOperations,
    buildAllocation,
    calculateNetResult,
    categorizeOperation,
    mapToCurrencyAmounts,
    positionToSnapshot,
    type OperationCategory,
} from './portfolio-snapshot.js';

// ── Helpers for building test data ──────────────────────────────────────────

function makeMoney(units: number, nano: number, currency = 'rub'): V1MoneyValue {
    return { units: String(units), nano, currency };
}

function makeQuotation(units: number, nano: number) {
    return { units: String(units), nano };
}

function makeOperation(type: string, units: number, nano: number, currency = 'rub'): V1OperationItem {
    return {
        type,
        payment: makeMoney(units, nano, currency),
    } as V1OperationItem;
}

/** Make a trade operation that uses `yield` for realizedPnl aggregation. */
function makeTradeOperation(
    type: string,
    yieldUnits: number,
    yieldNano: number,
    currency = 'rub',
): V1OperationItem {
    return {
        type,
        payment: makeMoney(0, 0, currency), // payment is ignored for trades
        yield: makeMoney(yieldUnits, yieldNano, currency),
    } as V1OperationItem;
}

// ── categorizeOperation ─────────────────────────────────────────────────────

describe('categorizeOperation', () => {
    test('maps trade operations to realizedPnl', () => {
        const tradeTypes = [
            'OPERATION_TYPE_BUY',
            'OPERATION_TYPE_SELL',
            'OPERATION_TYPE_BUY_MARGIN',
            'OPERATION_TYPE_SELL_MARGIN',
            'OPERATION_TYPE_BUY_CARD',
            'OPERATION_TYPE_SELL_CARD',
            'OPERATION_TYPE_DELIVERY_BUY',
            'OPERATION_TYPE_DELIVERY_SELL',
        ];
        for (const type of tradeTypes) {
            expect(categorizeOperation(type)).toBe('realizedPnl');
        }
    });

    test('maps dividend operations to dividends', () => {
        const types = [
            'OPERATION_TYPE_DIVIDEND',
            'OPERATION_TYPE_DIVIDEND_TRANSFER',
            'OPERATION_TYPE_DIV_EXT',
        ];
        for (const type of types) {
            expect(categorizeOperation(type)).toBe('dividends');
        }
    });

    test('maps coupon operations to coupons', () => {
        expect(categorizeOperation('OPERATION_TYPE_COUPON')).toBe('coupons');
    });

    test('maps bond repayment operations to bondRepayments', () => {
        expect(categorizeOperation('OPERATION_TYPE_BOND_REPAYMENT')).toBe('bondRepayments');
        expect(categorizeOperation('OPERATION_TYPE_BOND_REPAYMENT_FULL')).toBe('bondRepayments');
    });

    test('maps commission operations to commissions', () => {
        const types = [
            'OPERATION_TYPE_BROKER_FEE',
            'OPERATION_TYPE_SERVICE_FEE',
            'OPERATION_TYPE_MARGIN_FEE',
            'OPERATION_TYPE_SUCCESS_FEE',
            'OPERATION_TYPE_TRACK_MFEE',
            'OPERATION_TYPE_TRACK_PFEE',
            'OPERATION_TYPE_CASH_FEE',
            'OPERATION_TYPE_OUT_FEE',
            'OPERATION_TYPE_ADVICE_FEE',
            'OPERATION_TYPE_OUT_STAMP_DUTY',
            'OPERATION_TYPE_OVER_COM',
        ];
        for (const type of types) {
            expect(categorizeOperation(type)).toBe('commissions');
        }
    });

    test('maps tax operations to taxes', () => {
        const types = [
            'OPERATION_TYPE_TAX',
            'OPERATION_TYPE_BOND_TAX',
            'OPERATION_TYPE_DIVIDEND_TAX',
            'OPERATION_TYPE_BENEFIT_TAX',
            'OPERATION_TYPE_TAX_CORRECTION',
            'OPERATION_TYPE_TAX_PROGRESSIVE',
            'OPERATION_TYPE_BOND_TAX_PROGRESSIVE',
            'OPERATION_TYPE_DIVIDEND_TAX_PROGRESSIVE',
            'OPERATION_TYPE_BENEFIT_TAX_PROGRESSIVE',
            'OPERATION_TYPE_TAX_CORRECTION_PROGRESSIVE',
            'OPERATION_TYPE_TAX_REPO_PROGRESSIVE',
            'OPERATION_TYPE_TAX_REPO',
            'OPERATION_TYPE_TAX_REPO_HOLD',
            'OPERATION_TYPE_TAX_REPO_REFUND',
            'OPERATION_TYPE_TAX_REPO_HOLD_PROGRESSIVE',
            'OPERATION_TYPE_TAX_REPO_REFUND_PROGRESSIVE',
            'OPERATION_TYPE_TAX_CORRECTION_COUPON',
        ];
        for (const type of types) {
            expect(categorizeOperation(type)).toBe('taxes');
        }
    });

    test('maps money-in operations to moneyIn', () => {
        const types = [
            'OPERATION_TYPE_INPUT',
            'OPERATION_TYPE_INPUT_SWIFT',
            'OPERATION_TYPE_INPUT_ACQUIRING',
            'OPERATION_TYPE_INP_MULTI',
            'OPERATION_TYPE_TRANS_IIS_BS',
            'OPERATION_TYPE_TRANS_BS_BS',
        ];
        for (const type of types) {
            expect(categorizeOperation(type)).toBe('moneyIn');
        }
    });

    test('maps money-out operations to moneyOut', () => {
        const types = [
            'OPERATION_TYPE_OUTPUT',
            'OPERATION_TYPE_OUTPUT_SWIFT',
            'OPERATION_TYPE_OUTPUT_ACQUIRING',
            'OPERATION_TYPE_OUT_MULTI',
            'OPERATION_TYPE_OUTPUT_PENALTY',
        ];
        for (const type of types) {
            expect(categorizeOperation(type)).toBe('moneyOut');
        }
    });

    test('maps unknown operation type to other', () => {
        expect(categorizeOperation('OPERATION_TYPE_UNKNOWN_XYZ')).toBe('other');
        expect(categorizeOperation('')).toBe('other');
    });
});

// ── aggregateOperations ─────────────────────────────────────────────────────

describe('aggregateOperations', () => {
    test('sums multiple operations of the same category and currency', () => {
        const ops: V1OperationItem[] = [
            makeOperation('OPERATION_TYPE_DIVIDEND', 100, 0, 'rub'),
            makeOperation('OPERATION_TYPE_DIVIDEND', 50, 500_000_000, 'rub'),
        ];

        const result = aggregateOperations(ops);
        const dividends = result.get('dividends')!;
        expect(dividends.get('RUB')).toBeCloseTo(150.5);
    });

    test('groups different currencies separately', () => {
        const ops: V1OperationItem[] = [
            makeOperation('OPERATION_TYPE_DIVIDEND', 100, 0, 'rub'),
            makeOperation('OPERATION_TYPE_DIVIDEND', 10, 0, 'usd'),
        ];

        const result = aggregateOperations(ops);
        const dividends = result.get('dividends')!;
        expect(dividends.get('RUB')).toBe(100);
        expect(dividends.get('USD')).toBe(10);
    });

    test('skips operations without payment', () => {
        const ops: V1OperationItem[] = [
            { type: 'OPERATION_TYPE_DIVIDEND' } as V1OperationItem,
        ];

        const result = aggregateOperations(ops);
        expect(result.has('dividends')).toBe(false);
    });

    test('skips trade operations without yield (e.g. BUY without realized P&L)', () => {
        const ops: V1OperationItem[] = [
            {
                type: 'OPERATION_TYPE_BUY',
                payment: makeMoney(-500, 0),
            } as V1OperationItem,
        ];

        const result = aggregateOperations(ops);
        expect(result.has('realizedPnl')).toBe(false);
    });

    test('uses yield field for trade operations (realizedPnl)', () => {
        const ops: V1OperationItem[] = [
            makeTradeOperation('OPERATION_TYPE_SELL', 200, 0, 'rub'),
            makeTradeOperation('OPERATION_TYPE_SELL', 100, 500_000_000, 'rub'),
        ];

        const result = aggregateOperations(ops);
        const realized = result.get('realizedPnl')!;
        expect(realized.get('RUB')).toBeCloseTo(300.5);
    });

    test('skips operations without type', () => {
        const ops: V1OperationItem[] = [
            { payment: makeMoney(100, 0) } as V1OperationItem,
        ];

        const result = aggregateOperations(ops);
        expect(result.size).toBe(0);
    });

    test('skips operations categorized as other', () => {
        const ops: V1OperationItem[] = [
            makeOperation('OPERATION_TYPE_SOMETHING_UNKNOWN', 100, 0),
        ];

        const result = aggregateOperations(ops);
        expect(result.size).toBe(0);
    });

    test('aggregates multiple categories correctly', () => {
        const ops: V1OperationItem[] = [
            makeTradeOperation('OPERATION_TYPE_SELL', 500, 0, 'rub'), // yield = 500 (realized P&L)
            // BUY without yield is skipped for realizedPnl
            { type: 'OPERATION_TYPE_BUY', payment: makeMoney(-500, 0) } as V1OperationItem,
            makeOperation('OPERATION_TYPE_BROKER_FEE', -5, 0, 'rub'),
            makeOperation('OPERATION_TYPE_TAX', -130, 0, 'rub'),
            makeOperation('OPERATION_TYPE_COUPON', 35, 0, 'rub'),
        ];

        const result = aggregateOperations(ops);
        expect(result.get('realizedPnl')!.get('RUB')).toBe(500);
        expect(result.get('commissions')!.get('RUB')).toBe(-5);
        expect(result.get('taxes')!.get('RUB')).toBe(-130);
        expect(result.get('coupons')!.get('RUB')).toBe(35);
    });

    test('handles empty operations array', () => {
        const result = aggregateOperations([]);
        expect(result.size).toBe(0);
    });

    test('defaults missing currency to RUB', () => {
        const ops: V1OperationItem[] = [
            {
                type: 'OPERATION_TYPE_DIVIDEND',
                payment: { units: '100', nano: 0, currency: '' },
            } as V1OperationItem,
        ];

        const result = aggregateOperations(ops);
        expect(result.get('dividends')!.has('RUB')).toBe(true);
    });
});

// ── mapToCurrencyAmounts ────────────────────────────────────────────────────

describe('mapToCurrencyAmounts', () => {
    test('converts map to sorted CurrencyAmount array', () => {
        const map = new Map<string, number>([
            ['USD', 100],
            ['EUR', 200],
            ['RUB', 5000],
        ]);

        const result = mapToCurrencyAmounts(map);
        expect(result).toEqual([
            { currency: 'EUR', amount: 200 },
            { currency: 'RUB', amount: 5000 },
            { currency: 'USD', amount: 100 },
        ]);
    });

    test('returns empty array for undefined', () => {
        expect(mapToCurrencyAmounts(undefined)).toEqual([]);
    });

    test('returns empty array for empty map', () => {
        expect(mapToCurrencyAmounts(new Map())).toEqual([]);
    });

    test('sorts alphabetically by currency', () => {
        const map = new Map<string, number>([
            ['ZAR', 1],
            ['AED', 2],
        ]);
        const result = mapToCurrencyAmounts(map);
        expect(result[0].currency).toBe('AED');
        expect(result[1].currency).toBe('ZAR');
    });
});

// ── positionToSnapshot ──────────────────────────────────────────────────────

describe('positionToSnapshot', () => {
    test('calculates weight as percentage of total portfolio', () => {
        const pos: V1PortfolioPosition = {
            ticker: 'SBER',
            instrumentType: 'share',
            quantity: makeQuotation(10, 0),
            currentPrice: makeMoney(250, 0, 'rub'),
            averagePositionPrice: makeMoney(200, 0, 'rub'),
            expectedYield: makeQuotation(500, 0),
            dailyYield: makeQuotation(50, 0),
        } as V1PortfolioPosition;

        // 10 shares * 250 = 2500, portfolio = 10000 => weight = 25%
        const snapshot = positionToSnapshot(pos, 10000);
        expect(snapshot.weight).toBe(25);
        expect(snapshot.ticker).toBe('SBER');
        expect(snapshot.instrumentType).toBe('share');
        expect(snapshot.quantity).toBe(10);
    });

    test('returns weight 0 when total portfolio value is 0', () => {
        const pos: V1PortfolioPosition = {
            ticker: 'SBER',
            instrumentType: 'share',
            quantity: makeQuotation(10, 0),
            currentPrice: makeMoney(250, 0, 'rub'),
            averagePositionPrice: makeMoney(200, 0, 'rub'),
            expectedYield: makeQuotation(0, 0),
            dailyYield: makeQuotation(0, 0),
        } as V1PortfolioPosition;

        const snapshot = positionToSnapshot(pos, 0);
        expect(snapshot.weight).toBe(0);
    });

    test('rounds weight to 2 decimal places', () => {
        const pos: V1PortfolioPosition = {
            ticker: 'GAZP',
            instrumentType: 'share',
            quantity: makeQuotation(1, 0),
            currentPrice: makeMoney(333, 0, 'rub'),
            averagePositionPrice: makeMoney(300, 0, 'rub'),
            expectedYield: makeQuotation(33, 0),
            dailyYield: makeQuotation(0, 0),
        } as V1PortfolioPosition;

        // 333 / 10000 * 100 = 3.33
        const snapshot = positionToSnapshot(pos, 10000);
        expect(snapshot.weight).toBe(3.33);
    });

    test('uses figi when ticker is missing', () => {
        const pos: V1PortfolioPosition = {
            figi: 'BBG00123',
            instrumentType: 'bond',
            quantity: makeQuotation(1, 0),
            currentPrice: makeMoney(1000, 0, 'rub'),
            averagePositionPrice: makeMoney(950, 0, 'rub'),
            expectedYield: makeQuotation(50, 0),
            dailyYield: makeQuotation(0, 0),
        } as V1PortfolioPosition;

        const snapshot = positionToSnapshot(pos, 10000);
        expect(snapshot.ticker).toBe('BBG00123');
    });

    test('returns N/A when both ticker and figi are missing', () => {
        const pos: V1PortfolioPosition = {
            instrumentType: 'share',
            quantity: makeQuotation(1, 0),
            currentPrice: makeMoney(100, 0, 'rub'),
            expectedYield: makeQuotation(0, 0),
            dailyYield: makeQuotation(0, 0),
        } as V1PortfolioPosition;

        const snapshot = positionToSnapshot(pos, 10000);
        expect(snapshot.ticker).toBe('N/A');
    });

    test('formats prices with currency via formatQuotation', () => {
        const pos: V1PortfolioPosition = {
            ticker: 'AAPL',
            instrumentType: 'share',
            quantity: makeQuotation(5, 0),
            currentPrice: makeMoney(150, 750_000_000, 'usd'),
            averagePositionPrice: makeMoney(140, 0, 'usd'),
            expectedYield: makeQuotation(52, 500_000_000),
            dailyYield: makeQuotation(2, 0),
        } as V1PortfolioPosition;

        const snapshot = positionToSnapshot(pos, 100000);
        // formatQuotation: nano 750_000_000 -> "750000000" -> strip trailing 0s -> "75" -> padStart(2,'0') -> "75"
        expect(snapshot.currentPrice).toBe('150.75 USD');
        expect(snapshot.averagePrice).toBe('140.00 USD');
    });

    test('includes currentNkd for bonds when present', () => {
        const pos: V1PortfolioPosition = {
            ticker: 'OFZ26238',
            instrumentType: 'bond',
            quantity: makeQuotation(10, 0),
            currentPrice: makeMoney(590, 0, 'rub'),
            averagePositionPrice: makeMoney(600, 0, 'rub'),
            expectedYield: makeQuotation(-100, 0),
            dailyYield: makeQuotation(-5, 0),
            currentNkd: makeMoney(15, 350_000_000, 'rub'),
        } as V1PortfolioPosition;

        const snapshot = positionToSnapshot(pos, 100000);
        expect(snapshot.currentNkd).toBe('15.35 RUB');
    });

    test('currentNkd is undefined when not present', () => {
        const pos: V1PortfolioPosition = {
            ticker: 'SBER',
            instrumentType: 'share',
            quantity: makeQuotation(1, 0),
            currentPrice: makeMoney(250, 0, 'rub'),
            expectedYield: makeQuotation(0, 0),
            dailyYield: makeQuotation(0, 0),
        } as V1PortfolioPosition;

        const snapshot = positionToSnapshot(pos, 10000);
        expect(snapshot.currentNkd).toBeUndefined();
    });
});

// ── buildAllocation ─────────────────────────────────────────────────────────

describe('buildAllocation', () => {
    test('calculates allocation percentages from a single portfolio', () => {
        const portfolio: V1PortfolioResponse = {
            totalAmountShares: makeMoney(5000, 0, 'rub'),
            totalAmountBonds: makeMoney(3000, 0, 'rub'),
            totalAmountEtf: makeMoney(2000, 0, 'rub'),
            totalAmountCurrencies: makeMoney(0, 0, 'rub'),
            totalAmountFutures: makeMoney(0, 0, 'rub'),
        } as V1PortfolioResponse;

        const allocation = buildAllocation([portfolio], 10000);

        const shares = allocation.find((a) => a.type === 'Акции')!;
        expect(shares.percent).toBe(50);
        expect(shares.value).toEqual([{ currency: 'RUB', amount: 5000 }]);

        const bonds = allocation.find((a) => a.type === 'Облигации')!;
        expect(bonds.percent).toBe(30);

        const etf = allocation.find((a) => a.type === 'ETF')!;
        expect(etf.percent).toBe(20);
    });

    test('skips types with zero value', () => {
        const portfolio: V1PortfolioResponse = {
            totalAmountShares: makeMoney(10000, 0, 'rub'),
            totalAmountBonds: makeMoney(0, 0, 'rub'),
            totalAmountEtf: makeMoney(0, 0, 'rub'),
            totalAmountCurrencies: makeMoney(0, 0, 'rub'),
            totalAmountFutures: makeMoney(0, 0, 'rub'),
        } as V1PortfolioResponse;

        const allocation = buildAllocation([portfolio], 10000);
        expect(allocation).toHaveLength(1);
        expect(allocation[0].type).toBe('Акции');
        expect(allocation[0].percent).toBe(100);
    });

    test('aggregates values from multiple portfolios', () => {
        const p1: V1PortfolioResponse = {
            totalAmountShares: makeMoney(3000, 0, 'rub'),
            totalAmountBonds: makeMoney(0, 0, 'rub'),
        } as V1PortfolioResponse;

        const p2: V1PortfolioResponse = {
            totalAmountShares: makeMoney(2000, 0, 'rub'),
            totalAmountBonds: makeMoney(5000, 0, 'rub'),
        } as V1PortfolioResponse;

        const allocation = buildAllocation([p1, p2], 10000);

        const shares = allocation.find((a) => a.type === 'Акции')!;
        expect(shares.percent).toBe(50);
        expect(shares.value).toEqual([{ currency: 'RUB', amount: 5000 }]);
    });

    test('handles multiple currencies in allocation', () => {
        const p1: V1PortfolioResponse = {
            totalAmountShares: makeMoney(5000, 0, 'rub'),
        } as V1PortfolioResponse;

        const p2: V1PortfolioResponse = {
            totalAmountShares: makeMoney(100, 0, 'usd'),
        } as V1PortfolioResponse;

        const allocation = buildAllocation([p1, p2], 15000);

        const shares = allocation.find((a) => a.type === 'Акции')!;
        // values sorted alphabetically: RUB, USD
        expect(shares.value).toEqual([
            { currency: 'RUB', amount: 5000 },
            { currency: 'USD', amount: 100 },
        ]);
        // percent = (5000 + 100) / 15000 * 100 = 34.00
        expect(shares.percent).toBe(34);
    });

    test('returns 0 percent when totalValue is 0', () => {
        const portfolio: V1PortfolioResponse = {
            totalAmountShares: makeMoney(100, 0, 'rub'),
        } as V1PortfolioResponse;

        const allocation = buildAllocation([portfolio], 0);
        expect(allocation[0].percent).toBe(0);
    });

    test('returns empty array when no portfolios', () => {
        expect(buildAllocation([], 10000)).toEqual([]);
    });

    test('rounds percent to 2 decimal places', () => {
        const portfolio: V1PortfolioResponse = {
            totalAmountShares: makeMoney(3333, 0, 'rub'),
        } as V1PortfolioResponse;

        // 3333 / 10000 * 100 = 33.33
        const allocation = buildAllocation([portfolio], 10000);
        expect(allocation[0].percent).toBe(33.33);
    });
});

// ── calculateNetResult ──────────────────────────────────────────────────────

describe('calculateNetResult', () => {
    test('sums realized, dividends, coupons, bondRepayments, commissions, taxes', () => {
        const aggregated = new Map<OperationCategory, Map<string, number>>();
        aggregated.set('realizedPnl', new Map([['RUB', 1000]]));
        aggregated.set('dividends', new Map([['RUB', 500]]));
        aggregated.set('coupons', new Map([['RUB', 200]]));
        aggregated.set('bondRepayments', new Map([['RUB', 300]]));
        aggregated.set('commissions', new Map([['RUB', -50]])); // already negative
        aggregated.set('taxes', new Map([['RUB', -100]])); // already negative

        const result = calculateNetResult(aggregated);
        // 1000 + 500 + 200 + 300 + (-50) + (-100) = 1850
        expect(result).toEqual([{ currency: 'RUB', amount: 1850 }]);
    });

    test('does not include moneyIn or moneyOut', () => {
        const aggregated = new Map<OperationCategory, Map<string, number>>();
        aggregated.set('realizedPnl', new Map([['RUB', 1000]]));
        aggregated.set('moneyIn', new Map([['RUB', 50000]]));
        aggregated.set('moneyOut', new Map([['RUB', -20000]]));

        const result = calculateNetResult(aggregated);
        expect(result).toEqual([{ currency: 'RUB', amount: 1000 }]);
    });

    test('handles multiple currencies', () => {
        const aggregated = new Map<OperationCategory, Map<string, number>>();
        aggregated.set('realizedPnl', new Map([['RUB', 1000], ['USD', 100]]));
        aggregated.set('dividends', new Map([['USD', 50]]));
        aggregated.set('commissions', new Map([['RUB', -10], ['USD', -5]]));

        const result = calculateNetResult(aggregated);
        // RUB: 1000 + (-10) = 990
        // USD: 100 + 50 + (-5) = 145
        expect(result).toEqual([
            { currency: 'RUB', amount: 990 },
            { currency: 'USD', amount: 145 },
        ]);
    });

    test('returns empty array when no categories present', () => {
        const aggregated = new Map<OperationCategory, Map<string, number>>();
        const result = calculateNetResult(aggregated);
        expect(result).toEqual([]);
    });

    test('handles only taxes and commissions (negative net result)', () => {
        const aggregated = new Map<OperationCategory, Map<string, number>>();
        aggregated.set('commissions', new Map([['RUB', -150]]));
        aggregated.set('taxes', new Map([['RUB', -300]]));

        const result = calculateNetResult(aggregated);
        expect(result).toEqual([{ currency: 'RUB', amount: -450 }]);
    });
});
