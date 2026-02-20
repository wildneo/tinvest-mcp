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

export function round(value: number | undefined, decimals: number): string {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(decimals);
}

export function formatMoney(value: number | undefined): string {
    if (value === undefined || value === null) return 'N/A';
    return (
        value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
        ' \u20BD'
    );
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
}

const MONTH_SHORT_NAMES = [
    'Янв',
    'Фев',
    'Мар',
    'Апр',
    'Май',
    'Июн',
    'Июл',
    'Авг',
    'Сен',
    'Окт',
    'Ноя',
    'Дек',
];

export function joinMonths(months: number[]): string {
    return months.map((m) => MONTH_SHORT_NAMES[m - 1]).join('/');
}

export function truncate(str: string, maxLength: number): string {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return `${str.substring(0, maxLength - 1)}\u2026`;
}
