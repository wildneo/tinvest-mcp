import type { V1MoneyValue, V1Quotation } from '@wildneo/tinvest-client';

/**
 * Convert V1Quotation to number.
 * Quotation stores value as integer units + nano (billionths).
 */
export function quotationToNumber(q: V1Quotation | undefined): number {
    if (!q) return 0;
    const units = Number(q.units ?? 0);
    const nano = Number(q.nano ?? 0);
    return units + nano / 1_000_000_000;
}

/**
 * Convert V1MoneyValue to number.
 * MoneyValue stores value as integer units + nano (billionths).
 */
export function moneyToNumber(m: V1MoneyValue | undefined): number {
    if (!m) return 0;
    const units = Number(m.units ?? 0);
    const nano = Number(m.nano ?? 0);
    return units + nano / 1_000_000_000;
}
