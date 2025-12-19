import type { V1MoneyValue, V1Quotation } from '@wildneo/tinvest-client';

export function formatQuotation(value: V1Quotation | V1MoneyValue) {
    const units = BigInt(value.units ?? '0');
    const nano = BigInt(value.nano ?? 0);

    const sign = units < 0n || nano < 0n ? '-' : '';
    const unitsAbs = units < 0n ? -units : units;
    const nanoAbs = nano < 0n ? -nano : nano;

    const fraction = nanoAbs.toString().padStart(9, '0').replace(/0+$/, '');

    if ('currency' in value && value.currency) {
        const currency = value.currency.toUpperCase();

        return `${sign}${unitsAbs}.${fraction.padStart(2, '0')} ${currency}`;
    }

    return `${sign}${unitsAbs}${fraction ? `.${fraction}` : ''}`;
}

export function formatBoolean(value: boolean) {
    return value ? 'Да' : 'Нет';
}
