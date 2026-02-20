import { readFile } from 'node:fs/promises';
import type {
    V1AssetResponse,
    V1BondResponse,
    V1EditFavoritesResponse,
    V1EtfResponse,
    V1FindInstrumentResponse,
    V1GetAccountsResponse,
    V1GetAccruedInterestsResponse,
    V1GetAssetFundamentalsResponse,
    V1GetBondCouponsResponse,
    V1GetCandlesResponse,
    V1GetConsensusForecastsResponse,
    V1GetDividendsResponse,
    V1GetFavoriteGroupsResponse,
    V1GetFavoritesResponse,
    V1GetForecastResponse,
    V1GetInfoResponse,
    V1GetLastPricesResponse,
    V1InstrumentResponse,
    V1PortfolioResponse,
    V1PositionsResponse,
    V1ShareResponse,
} from '@wildneo/tinvest-client';
import Handlebars from 'handlebars';

import type { OfzCouponCalendarResult } from '../services/ofz-calendar.js';
import {
    formatBoolean,
    formatDate,
    formatDateTime,
    formatMoney,
    formatQuotation,
    joinMonths,
    round,
    truncate,
} from './template-helpers.js';

Handlebars.registerHelper('quote', formatQuotation);
Handlebars.registerHelper('answer', formatBoolean);
Handlebars.registerHelper('round', round);
Handlebars.registerHelper('formatMoney', formatMoney);
Handlebars.registerHelper('formatDate', formatDate);
Handlebars.registerHelper('formatDateTime', formatDateTime);
Handlebars.registerHelper('joinMonths', joinMonths);
Handlebars.registerHelper('truncate', truncate);

export async function getUserInfoFromTemplate(data: V1GetInfoResponse) {
    const template = await readFile(
        new URL('../templates/user-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetInfoResponse>(template);

    return compiledTemplate(data);
}

export async function getAccountsFromTemplate(data: V1GetAccountsResponse) {
    const template = await readFile(
        new URL('../templates/accounts-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetAccountsResponse>(template);

    return compiledTemplate(data, {});
}

export async function getPortfolioFromTemplate(data: V1PortfolioResponse) {
    const template = await readFile(
        new URL('../templates/portfolio-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1PortfolioResponse>(template);

    return compiledTemplate(data);
}

export async function getPositionsFromTemplate(data: V1PositionsResponse) {
    const template = await readFile(
        new URL('../templates/positions-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1PositionsResponse>(template);

    return compiledTemplate(data);
}

export async function getInstrumentFromTemplate(data: V1InstrumentResponse) {
    const template = await readFile(
        new URL('../templates/instrument-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1InstrumentResponse>(template);

    return compiledTemplate(data);
}

export async function getAssetFromTemplate(data: V1AssetResponse) {
    const template = await readFile(
        new URL('../templates/asset-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1AssetResponse>(template);

    return compiledTemplate(data);
}

export async function getDividendsFromTemplate(data: V1GetDividendsResponse) {
    const template = await readFile(
        new URL('../templates/dividends-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetDividendsResponse>(template);

    return compiledTemplate(data);
}

export async function getBondCouponsFromTemplate(data: V1GetBondCouponsResponse) {
    const template = await readFile(
        new URL('../templates/bond-coupons-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetBondCouponsResponse>(template);

    return compiledTemplate(data);
}

export async function getAccruedInterestsFromTemplate(data: V1GetAccruedInterestsResponse) {
    const template = await readFile(
        new URL('../templates/accrued-interests-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetAccruedInterestsResponse>(template);

    return compiledTemplate(data);
}

export async function getConsensusForecastsFromTemplate(data: V1GetConsensusForecastsResponse) {
    const template = await readFile(
        new URL('../templates/consensus-forecasts-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetConsensusForecastsResponse>(template);

    return compiledTemplate(data);
}

export async function getForecastByFromTemplate(data: V1GetForecastResponse) {
    const template = await readFile(
        new URL('../templates/forecast-by-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetForecastResponse>(template);

    return compiledTemplate(data);
}

export async function getAssetFundamentalsFromTemplate(data: V1GetAssetFundamentalsResponse) {
    const template = await readFile(
        new URL('../templates/asset-fundamentals-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetAssetFundamentalsResponse>(template);

    return compiledTemplate(data);
}

export async function getLastPricesFromTemplate(data: V1GetLastPricesResponse) {
    const template = await readFile(
        new URL('../templates/last-prices-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetLastPricesResponse>(template);

    return compiledTemplate(data);
}

export async function getShareFromTemplate(data: V1ShareResponse) {
    const template = await readFile(
        new URL('../templates/share-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1ShareResponse>(template);

    return compiledTemplate(data);
}

export async function getBondFromTemplate(data: V1BondResponse) {
    const template = await readFile(
        new URL('../templates/bond-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1BondResponse>(template);

    return compiledTemplate(data);
}

export async function getEtfFromTemplate(data: V1EtfResponse) {
    const template = await readFile(new URL('../templates/etf-info.hbs', import.meta.url), 'utf-8');
    const compiledTemplate = Handlebars.compile<V1EtfResponse>(template);

    return compiledTemplate(data);
}

export async function getCandlesFromTemplate(data: V1GetCandlesResponse) {
    const template = await readFile(
        new URL('../templates/candles-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetCandlesResponse>(template);

    return compiledTemplate(data);
}

export async function getFindInstrumentFromTemplate(data: V1FindInstrumentResponse) {
    const template = await readFile(
        new URL('../templates/find-instrument-info.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1FindInstrumentResponse>(template);

    return compiledTemplate(data);
}

export async function getOfzCouponCalendarFromTemplate(data: OfzCouponCalendarResult) {
    const template = await readFile(
        new URL('../templates/ofz-coupon-calendar.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<OfzCouponCalendarResult>(template);

    return compiledTemplate(data);
}

export async function getFavoritesFromTemplate(data: V1GetFavoritesResponse) {
    const template = await readFile(
        new URL('../templates/favorites-list.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetFavoritesResponse>(template);

    return compiledTemplate(data);
}

export async function getFavoriteGroupsFromTemplate(data: V1GetFavoriteGroupsResponse) {
    const template = await readFile(
        new URL('../templates/favorite-groups.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1GetFavoriteGroupsResponse>(template);

    return compiledTemplate(data);
}

export async function getEditFavoritesResultFromTemplate(data: V1EditFavoritesResponse) {
    const template = await readFile(
        new URL('../templates/favorites-edit-result.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<V1EditFavoritesResponse>(template);

    return compiledTemplate(data);
}

export type FavoriteGroupResultData = {
    action: 'create' | 'delete';
    groupId?: string;
    groupName?: string;
    success: boolean;
};

export async function getFavoriteGroupResultFromTemplate(data: FavoriteGroupResultData) {
    const template = await readFile(
        new URL('../templates/favorite-group-result.hbs', import.meta.url),
        'utf-8',
    );
    const compiledTemplate = Handlebars.compile<FavoriteGroupResultData>(template);

    return compiledTemplate(data);
}
