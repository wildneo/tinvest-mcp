/**
 * Portfolio Snapshot service.
 * Builds a comprehensive portfolio snapshot across all user accounts
 * with P&L summary, asset allocation, tax shield, and position details.
 */
import {
    operationsServiceGetOperationsByCursor,
    operationsServiceGetPortfolio,
    usersServiceGetAccounts,
    V1AccountStatus,
    type V1Account,
    type V1MoneyValue,
    type V1OperationItem,
    type V1PortfolioPosition,
    type V1PortfolioResponse,
    type V1Quotation,
} from '@wildneo/tinvest-client';
import { moneyToNumber, quotationToNumber } from '../utils/converters.js';
import { formatQuotation } from '../utils/template-helpers.js';

// ── Types ──────────────────────────────────────────────────────────────────

export type CurrencyAmount = {
    currency: string;
    amount: number;
};

export type PositionSnapshot = {
    ticker: string;
    instrumentType: string;
    quantity: number;
    averagePrice: string;
    currentPrice: string;
    expectedYield: string;
    dailyYield: string;
    weight: number;
    currentNkd?: string;
};

export type AccountSnapshot = {
    accountId: string;
    accountName: string;
    totalValue: string;
    positionsCount: number;
};

export type AllocationEntry = {
    type: string;
    value: CurrencyAmount[];
    percent: number;
};

export type PortfolioSnapshotResult = {
    generatedAt: string;
    from: string;
    to: string;
    totalPortfolioValue: CurrencyAmount[];

    allocation: AllocationEntry[];

    sharePositions: PositionSnapshot[];
    bondPositions: PositionSnapshot[];
    etfPositions: PositionSnapshot[];
    otherPositions: PositionSnapshot[];

    accounts: AccountSnapshot[];

    realizedPnl: CurrencyAmount[];
    dividends: CurrencyAmount[];
    coupons: CurrencyAmount[];
    bondRepayments: CurrencyAmount[];
    commissions: CurrencyAmount[];
    taxes: CurrencyAmount[];
    moneyIn: CurrencyAmount[];
    moneyOut: CurrencyAmount[];

    unrealizedPnl: number;

    netResult: CurrencyAmount[];
};

// ── Operation Type Categories ──────────────────────────────────────────────

const TRADE_TYPES = new Set([
    'OPERATION_TYPE_BUY',
    'OPERATION_TYPE_SELL',
    'OPERATION_TYPE_BUY_MARGIN',
    'OPERATION_TYPE_SELL_MARGIN',
    'OPERATION_TYPE_BUY_CARD',
    'OPERATION_TYPE_SELL_CARD',
    'OPERATION_TYPE_DELIVERY_BUY',
    'OPERATION_TYPE_DELIVERY_SELL',
]);

const DIVIDEND_TYPES = new Set([
    'OPERATION_TYPE_DIVIDEND',
    'OPERATION_TYPE_DIVIDEND_TRANSFER',
    'OPERATION_TYPE_DIV_EXT',
]);

const COUPON_TYPES = new Set(['OPERATION_TYPE_COUPON']);

const BOND_REPAYMENT_TYPES = new Set([
    'OPERATION_TYPE_BOND_REPAYMENT',
    'OPERATION_TYPE_BOND_REPAYMENT_FULL',
]);

const COMMISSION_TYPES = new Set([
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
]);

const TAX_TYPES = new Set([
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
]);

const MONEY_IN_TYPES = new Set([
    'OPERATION_TYPE_INPUT',
    'OPERATION_TYPE_INPUT_SWIFT',
    'OPERATION_TYPE_INPUT_ACQUIRING',
    'OPERATION_TYPE_INP_MULTI',
    'OPERATION_TYPE_TRANS_IIS_BS',
    'OPERATION_TYPE_TRANS_BS_BS',
]);

const MONEY_OUT_TYPES = new Set([
    'OPERATION_TYPE_OUTPUT',
    'OPERATION_TYPE_OUTPUT_SWIFT',
    'OPERATION_TYPE_OUTPUT_ACQUIRING',
    'OPERATION_TYPE_OUT_MULTI',
    'OPERATION_TYPE_OUTPUT_PENALTY',
]);

// ── Helpers ────────────────────────────────────────────────────────────────

export type OperationCategory =
    | 'realizedPnl'
    | 'dividends'
    | 'coupons'
    | 'bondRepayments'
    | 'commissions'
    | 'taxes'
    | 'moneyIn'
    | 'moneyOut'
    | 'other';

export function categorizeOperation(type: string): OperationCategory {
    if (TRADE_TYPES.has(type)) return 'realizedPnl';
    if (DIVIDEND_TYPES.has(type)) return 'dividends';
    if (COUPON_TYPES.has(type)) return 'coupons';
    if (BOND_REPAYMENT_TYPES.has(type)) return 'bondRepayments';
    if (COMMISSION_TYPES.has(type)) return 'commissions';
    if (TAX_TYPES.has(type)) return 'taxes';
    if (MONEY_IN_TYPES.has(type)) return 'moneyIn';
    if (MONEY_OUT_TYPES.has(type)) return 'moneyOut';
    return 'other';
}

function safeFormatQuotation(value: V1Quotation | V1MoneyValue | undefined): string {
    if (!value) return 'N/A';
    return formatQuotation(value);
}

/**
 * Fetch all operations for an account with cursor pagination.
 */
async function fetchAllOperations(params: {
    accountId: string;
    from: string;
    to: string;
}): Promise<V1OperationItem[]> {
    const allItems: V1OperationItem[] = [];
    let cursor: string | undefined;
    let iterations = 0;
    const MAX_ITERATIONS = 100;

    do {
        const { data } = await operationsServiceGetOperationsByCursor({
            body: {
                accountId: params.accountId,
                from: params.from,
                to: params.to,
                limit: 1000,
                state: 'OPERATION_STATE_EXECUTED',
                cursor,
            },
        });

        if (data.items) {
            allItems.push(...data.items);
        }

        cursor = data.hasNext ? (data.nextCursor ?? undefined) : undefined;
        iterations++;
    } while (cursor && iterations < MAX_ITERATIONS);

    return allItems;
}

/**
 * Aggregate operations by category and currency.
 *
 * For trade operations (realizedPnl): uses `yield` field (broker-calculated P&L),
 * not `payment` (cash flow). BUY operations without yield are skipped.
 * For other categories: uses `payment` (cash flow).
 */
export function aggregateOperations(
    items: V1OperationItem[],
): Map<OperationCategory, Map<string, number>> {
    const result = new Map<OperationCategory, Map<string, number>>();

    for (const item of items) {
        if (!item.type) continue;

        const category = categorizeOperation(item.type);
        if (category === 'other') continue;

        let amount: number;
        let currency: string;

        if (category === 'realizedPnl') {
            // Use yield (broker-calculated P&L) for realized gains/losses
            if (!item.yield) continue; // BUY without yield — no realized P&L
            amount = moneyToNumber(item.yield);
            currency = (item.yield.currency || 'RUB').toUpperCase();
        } else {
            // Use payment (cash flow) for dividends, coupons, fees, taxes, etc.
            if (!item.payment) continue;
            amount = moneyToNumber(item.payment);
            currency = (item.payment.currency || 'RUB').toUpperCase();
        }

        if (!result.has(category)) result.set(category, new Map());
        const currMap = result.get(category)!;
        currMap.set(currency, (currMap.get(currency) || 0) + amount);
    }

    return result;
}

export function mapToCurrencyAmounts(map: Map<string, number> | undefined): CurrencyAmount[] {
    if (!map || map.size === 0) return [];
    return Array.from(map.entries())
        .map(([currency, amount]) => ({ currency, amount }))
        .sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * Convert a portfolio position to a snapshot entry.
 */
export function positionToSnapshot(
    pos: V1PortfolioPosition,
    totalPortfolioValue: number,
): PositionSnapshot {
    const currentPriceNum = moneyToNumber(pos.currentPrice);
    const quantityNum = quotationToNumber(pos.quantity);
    const positionValue = currentPriceNum * quantityNum;
    const weight = totalPortfolioValue > 0 ? (positionValue / totalPortfolioValue) * 100 : 0;

    return {
        ticker: pos.ticker ?? pos.figi ?? 'N/A',
        instrumentType: pos.instrumentType ?? 'unknown',
        quantity: quantityNum,
        averagePrice: safeFormatQuotation(pos.averagePositionPrice),
        currentPrice: safeFormatQuotation(pos.currentPrice),
        expectedYield: safeFormatQuotation(pos.expectedYield),
        dailyYield: safeFormatQuotation(pos.dailyYield),
        weight: Math.round(weight * 100) / 100,
        currentNkd: pos.currentNkd ? safeFormatQuotation(pos.currentNkd) : undefined,
    };
}

/**
 * Build allocation entries from portfolio totals.
 */
export function buildAllocation(
    portfolios: V1PortfolioResponse[],
    totalValue: number,
): AllocationEntry[] {
    const typeKeys: Array<{
        type: string;
        key: keyof V1PortfolioResponse;
    }> = [
        { type: 'Акции', key: 'totalAmountShares' },
        { type: 'Облигации', key: 'totalAmountBonds' },
        { type: 'ETF', key: 'totalAmountEtf' },
        { type: 'Валюта', key: 'totalAmountCurrencies' },
        { type: 'Фьючерсы', key: 'totalAmountFutures' },
        { type: 'Опционы', key: 'totalAmountOptions' },
        { type: 'Структурные ноты', key: 'totalAmountSp' },
    ];

    const allocation: AllocationEntry[] = [];

    for (const { type, key } of typeKeys) {
        const currMap = new Map<string, number>();

        for (const portfolio of portfolios) {
            const value = portfolio[key] as V1MoneyValue | undefined;
            if (!value) continue;
            const amount = moneyToNumber(value);
            if (amount === 0) continue;
            const currency = (value.currency || 'RUB').toUpperCase();
            currMap.set(currency, (currMap.get(currency) || 0) + amount);
        }

        const totalForType = Array.from(currMap.values()).reduce((sum, v) => sum + v, 0);
        if (totalForType === 0) continue;

        const percent = totalValue > 0 ? Math.round((totalForType / totalValue) * 10000) / 100 : 0;

        allocation.push({
            type,
            value: mapToCurrencyAmounts(currMap),
            percent,
        });
    }

    return allocation;
}

/**
 * Calculate net result: realized + dividends + coupons + bondRepayments - |commissions| - |taxes|
 */
export function calculateNetResult(
    aggregated: Map<OperationCategory, Map<string, number>>,
): CurrencyAmount[] {
    const netMap = new Map<string, number>();

    const addCategory = (category: OperationCategory) => {
        const currMap = aggregated.get(category);
        if (!currMap) return;
        for (const [currency, amount] of currMap) {
            netMap.set(currency, (netMap.get(currency) || 0) + amount);
        }
    };

    addCategory('realizedPnl');
    addCategory('dividends');
    addCategory('coupons');
    addCategory('bondRepayments');
    addCategory('commissions'); // already negative
    addCategory('taxes'); // already negative

    return mapToCurrencyAmounts(netMap);
}

// ── Main ───────────────────────────────────────────────────────────────────

export type PortfolioSnapshotParams = {
    from: string;
    to: string;
};

/**
 * Build a comprehensive portfolio snapshot across all user accounts.
 */
export async function buildPortfolioSnapshot(
    params: PortfolioSnapshotParams,
): Promise<PortfolioSnapshotResult> {
    const { from, to } = params;
    const now = new Date();

    // 1. Get all accounts
    const { data: accountsData } = await usersServiceGetAccounts({ body: {} });
    const accounts = (accountsData.accounts ?? []).filter(
        (acc: V1Account) => acc.status === V1AccountStatus.ACCOUNT_STATUS_OPEN,
    );

    if (accounts.length === 0) {
        return emptyResult(from, to, now);
    }

    // 2. Fetch portfolio and operations for each account in parallel
    const accountResults = await Promise.all(
        accounts.map(async (acc) => {
            const accountId = acc.id!;
            try {
                const [portfolioResult, operations] = await Promise.all([
                    operationsServiceGetPortfolio({ body: { accountId } }),
                    fetchAllOperations({ accountId, from, to }),
                ]);
                return {
                    account: acc,
                    portfolio: portfolioResult.data,
                    operations,
                };
            } catch {
                return { account: acc, portfolio: null, operations: [] };
            }
        }),
    );

    // 3. Aggregate portfolios
    const portfolios = accountResults
        .map((r) => r.portfolio)
        .filter((p): p is V1PortfolioResponse => p !== null);

    const totalPortfolioMap = new Map<string, number>();
    for (const portfolio of portfolios) {
        if (portfolio.totalAmountPortfolio) {
            const currency = (portfolio.totalAmountPortfolio.currency || 'RUB').toUpperCase();
            const amount = moneyToNumber(portfolio.totalAmountPortfolio);
            totalPortfolioMap.set(currency, (totalPortfolioMap.get(currency) || 0) + amount);
        }
    }
    const totalPortfolioValue = mapToCurrencyAmounts(totalPortfolioMap);
    const totalValueRub = Array.from(totalPortfolioMap.values()).reduce((s, v) => s + v, 0);

    // 4. Collect and group positions
    const allPositions: Array<{ pos: V1PortfolioPosition; totalValue: number }> = [];
    for (const portfolio of portfolios) {
        const portfolioTotal = moneyToNumber(portfolio.totalAmountPortfolio);
        for (const pos of portfolio.positions ?? []) {
            allPositions.push({ pos, totalValue: totalValueRub > 0 ? totalValueRub : portfolioTotal });
        }
    }

    const sharePositions: PositionSnapshot[] = [];
    const bondPositions: PositionSnapshot[] = [];
    const etfPositions: PositionSnapshot[] = [];
    const otherPositions: PositionSnapshot[] = [];

    for (const { pos, totalValue } of allPositions) {
        const snapshot = positionToSnapshot(pos, totalValue);
        switch (pos.instrumentType) {
            case 'share':
                sharePositions.push(snapshot);
                break;
            case 'bond':
                bondPositions.push(snapshot);
                break;
            case 'etf':
                etfPositions.push(snapshot);
                break;
            default:
                otherPositions.push(snapshot);
                break;
        }
    }

    // Sort by weight descending
    const sortByWeight = (a: PositionSnapshot, b: PositionSnapshot) => b.weight - a.weight;
    sharePositions.sort(sortByWeight);
    bondPositions.sort(sortByWeight);
    etfPositions.sort(sortByWeight);
    otherPositions.sort(sortByWeight);

    // 5. Build allocation
    const allocation = buildAllocation(portfolios, totalValueRub);

    // 6. Build account snapshots
    const accountSnapshots: AccountSnapshot[] = accountResults
        .filter((r) => r.portfolio !== null)
        .map((r) => ({
            accountId: r.account.id ?? 'N/A',
            accountName: r.account.name ?? 'Без названия',
            totalValue: safeFormatQuotation(r.portfolio!.totalAmountPortfolio),
            positionsCount: r.portfolio!.positions?.length ?? 0,
        }));

    // 7. Aggregate all operations across accounts
    const allOperations = accountResults.flatMap((r) => r.operations);
    const aggregated = aggregateOperations(allOperations);

    // 8. Calculate unrealized P&L (sum position-level expectedYield, not portfolio-level)
    // Portfolio-level expectedYield is a percentage, position-level is absolute value
    let unrealizedPnl = 0;
    for (const portfolio of portfolios) {
        for (const pos of portfolio.positions ?? []) {
            if (pos.expectedYield) {
                unrealizedPnl += quotationToNumber(pos.expectedYield);
            }
        }
    }

    // 9. Calculate net result
    const netResult = calculateNetResult(aggregated);

    return {
        generatedAt: now.toISOString(),
        from,
        to,
        totalPortfolioValue,
        allocation,
        sharePositions,
        bondPositions,
        etfPositions,
        otherPositions,
        accounts: accountSnapshots,
        realizedPnl: mapToCurrencyAmounts(aggregated.get('realizedPnl')),
        dividends: mapToCurrencyAmounts(aggregated.get('dividends')),
        coupons: mapToCurrencyAmounts(aggregated.get('coupons')),
        bondRepayments: mapToCurrencyAmounts(aggregated.get('bondRepayments')),
        commissions: mapToCurrencyAmounts(aggregated.get('commissions')),
        taxes: mapToCurrencyAmounts(aggregated.get('taxes')),
        moneyIn: mapToCurrencyAmounts(aggregated.get('moneyIn')),
        moneyOut: mapToCurrencyAmounts(aggregated.get('moneyOut')),
        unrealizedPnl,
        netResult,
    };
}

function emptyResult(from: string, to: string, now: Date): PortfolioSnapshotResult {
    return {
        generatedAt: now.toISOString(),
        from,
        to,
        totalPortfolioValue: [],
        allocation: [],
        sharePositions: [],
        bondPositions: [],
        etfPositions: [],
        otherPositions: [],
        accounts: [],
        realizedPnl: [],
        dividends: [],
        coupons: [],
        bondRepayments: [],
        commissions: [],
        taxes: [],
        moneyIn: [],
        moneyOut: [],
        unrealizedPnl: 0,
        netResult: [],
    };
}
