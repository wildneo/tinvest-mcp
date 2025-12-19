import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    instrumentsServiceGetAccruedInterests,
    instrumentsServiceGetAssetFundamentals,
    instrumentsServiceGetBondCoupons,
    instrumentsServiceGetDividends,
    instrumentsServiceGetForecastBy,
} from '@wildneo/tinvest-client';
import { z } from 'zod';
import {
    getAccruedInterestsFromTemplate,
    getAssetFundamentalsFromTemplate,
    getBondCouponsFromTemplate,
    getDividendsFromTemplate,
    getForecastByFromTemplate,
} from '../utils/templates.js';

export function registerAnalyticsTools(server: McpServer) {
    server.registerTool(
        'get_dividends',
        {
            title: 'Получить информацию о дивидендах за указанный период',
            description: `Получить историю и предстоящие выплаты дивидендов по UID инструмента.

КОГДА ИСПОЛЬЗОВАТЬ:
- При планировании дивидендного дохода
- При анализе стабильности дивидендных выплат компании
- При сравнении дивидендных акций между собой

Возвращает: даты выплат, размеры дивидендов, дивидендную доходность.`,
            inputSchema: z.object({
                uid: z.string().describe('UID акции. Получить через find_instrument.'),
                from: z
                    .string()
                    .optional()
                    .describe('Начало периода в формате ISO 8601 (например: 2024-01-01T00:00:00Z)'),
                to: z
                    .string()
                    .optional()
                    .describe(
                        'Окончание периода в формате ISO 8601 (например: 2024-12-31T23:59:59Z)',
                    ),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceGetDividends({
                body: { instrumentId: body.uid, from: body.from, to: body.to },
            });

            const dividendsInfo = await getDividendsFromTemplate(data);

            return {
                content: [
                    {
                        text: dividendsInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_bond_coupons',
        {
            title: 'Получить график выплат купонов по облигации за указанный период',
            description: `Получить расписание и размеры купонных выплат по UID облигации.

КОГДА ИСПОЛЬЗОВАТЬ:
- При выборе облигаций для покупки
- При расчёте доходности облигации
- При планировании купонного дохода
- При сравнении облигаций между собой

Возвращает: даты выплат купонов, размеры купонов, купонную доходность.`,
            inputSchema: z.object({
                uid: z.string().describe('UID облигации. Получить через find_instrument.'),
                from: z
                    .string()
                    .optional()
                    .describe('Начало периода в формате ISO 8601 (например: 2024-01-01T00:00:00Z)'),
                to: z
                    .string()
                    .optional()
                    .describe(
                        'Окончание периода в формате ISO 8601 (например: 2024-12-31T23:59:59Z)',
                    ),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceGetBondCoupons({
                body: { instrumentId: body.uid, from: body.from, to: body.to },
            });

            const bondCouponsInfo = await getBondCouponsFromTemplate(data);

            return {
                content: [
                    {
                        text: bondCouponsInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_accrued_interests',
        {
            title: 'Получить накопленный купонный доход (НКД) по облигации за указанный период',
            description: `Получить накопленный купонный доход (НКД) по UID облигации.

КОГДА ИСПОЛЬЗОВАТЬ:
- При расчёте полной стоимости покупки облигации
- При оценке момента покупки/продажи облигации
- При расчёте реальной доходности облигации`,
            inputSchema: z.object({
                uid: z.string().describe('UID облигации. Получить через find_instrument.'),
                from: z
                    .string()
                    .describe('Начало периода в формате ISO 8601 (например: 2024-01-01T00:00:00Z)'),
                to: z
                    .string()
                    .describe(
                        'Окончание периода в формате ISO 8601 (например: 2024-12-31T23:59:59Z)',
                    ),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceGetAccruedInterests({
                body: { instrumentId: body.uid, from: body.from, to: body.to },
            });

            const accruedInterestsInfo = await getAccruedInterestsFromTemplate(data);

            return {
                content: [
                    {
                        text: accruedInterestsInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_forecast',
        {
            title: 'Получить прогнозы инвестиционных домов по конкретному инструменту',
            description: `Получить консенсус-прогнозы и рекомендации ведущих инвестиционных домов (аналитиков) по UID инструмента.

КОГДА ИСПОЛЬЗОВАТЬ:
- При оценке потенциала роста/падения актива
- При сравнении инвестиционной привлекательности активов
- При формировании инвестиционной стратегии

Возвращает: целевые цены, рекомендации (покупать/держать/продавать), консенсус-прогноз от профессиональных аналитиков.`,
            inputSchema: z.object({
                uid: z.string().describe('UID инструмента. Получить через find_instrument.'),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceGetForecastBy({
                body: { instrumentId: body.uid },
            });

            const forecastByInfo = await getForecastByFromTemplate(data);

            return {
                content: [
                    {
                        text: forecastByInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_asset_fundamentals',
        {
            title: 'Получить фундаментальные показатели по активам',
            description: `Получить ключевые фундаментальные показатели для оценки инвестиционной привлекательности активов по массиву Asset UID.

ВАЖНО: Этот инструмент принимает Asset UID (НЕ UID инструмента!). Asset UID можно получить через:
- get_share_info
- get_bond_info
- get_etf_info
- get_instrument_info

Типичный порядок: find_instrument (получить UID) → get_share_info (получить Asset UID) → get_asset_fundamentals

КОГДА ИСПОЛЬЗОВАТЬ:
- При поиске дивидендных акций — показывает дивидендную доходность
- При анализе финансового здоровья компании
- При усреднении позиции — для понимания текущей оценки актива

Возвращает показатели:
- P/E (цена/прибыль) — оценка стоимости относительно прибыли
- P/B (цена/балансовая стоимость) — оценка относительно активов
- ROE (рентабельность капитала) — эффективность компании
- Дивидендная доходность и другие метрики`,
            inputSchema: z.object({
                assetUids: z
                    .array(z.string())
                    .describe(
                        'Массив Asset UID. Получить через get_share_info, get_bond_info, get_etf_info или get_instrument_info.',
                    ),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceGetAssetFundamentals({
                body: { assets: body.assetUids },
            });

            const assetFundamentalsInfo = await getAssetFundamentalsFromTemplate(data);

            return {
                content: [
                    {
                        text: assetFundamentalsInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );
}
