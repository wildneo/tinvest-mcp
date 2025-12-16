import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    instrumentsServiceGetAccruedInterests,
    instrumentsServiceGetAssetFundamentals,
    instrumentsServiceGetBondCoupons,
    instrumentsServiceGetDividends,
    instrumentsServiceGetForecastBy,
} from '@wildneo/tinvest-client';
import {
    zV1GetAccruedInterestsRequest,
    zV1GetAssetFundamentalsRequest,
    zV1GetBondCouponsRequest,
    zV1GetDividendsRequest,
    zV1GetForecastRequest,
} from '@wildneo/tinvest-client/validations';
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
            description: `Получить историю и предстоящие выплаты дивидендов по figi или instrument_uid.

КОГДА ИСПОЛЬЗОВАТЬ:
- При планировании дивидендного дохода
- При анализе стабильности дивидендных выплат компании
- При сравнении дивидендных акций между собой

Возвращает: даты выплат, размеры дивидендов, дивидендную доходность.`,
            inputSchema: zV1GetDividendsRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceGetDividends({ body });

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
            description: `Получить расписание и размеры купонных выплат по figi или instrument_uid.

КОГДА ИСПОЛЬЗОВАТЬ:
- При выборе облигаций для покупки
- При расчёте доходности облигации
- При планировании купонного дохода
- При сравнении облигаций между собой

Возвращает: даты выплат купонов, размеры купонов, купонную доходность.`,
            inputSchema: zV1GetBondCouponsRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceGetBondCoupons({ body });

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
            description: `Получить накопленный купонный доход (НКД) по figi или instrument_uid.

КОГДА ИСПОЛЬЗОВАТЬ:
- При расчёте полной стоимости покупки облигации
- При оценке момента покупки/продажи облигации
- При расчёте реальной доходности облигации`,
            inputSchema: zV1GetAccruedInterestsRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceGetAccruedInterests({ body });

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
            description: `Получить консенсус-прогнозы и рекомендации ведущих инвестиционных домов (аналитиков) по figi или instrument_uid.

КОГДА ИСПОЛЬЗОВАТЬ:
- При оценке потенциала роста/падения актива
- При сравнении инвестиционной привлекательности активов
- При формировании инвестиционной стратегии

Возвращает: целевые цены, рекомендации (покупать/держать/продавать), консенсус-прогноз от профессиональных аналитиков.`,
            inputSchema: zV1GetForecastRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceGetForecastBy({ body });

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
            description: `Получить ключевые фундаментальные показатели для оценки инвестиционной привлекательности активов по figi или instrument_uid.

КОГДА ИСПОЛЬЗОВАТЬ:
- При поиске дивидендных акций — показывает дивидендную доходность
- При анализе финансового здоровья компании
- При усреднении позиции — для понимания текущей оценки актива

Возвращает показатели:
- P/E (цена/прибыль) — оценка стоимости относительно прибыли
- P/B (цена/балансовая стоимость) — оценка относительно активов
- ROE (рентабельность капитала) — эффективность компании
- Дивидендная доходность и другие метрики`,
            inputSchema: zV1GetAssetFundamentalsRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceGetAssetFundamentals({ body });

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
