import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    marketDataServiceGetCandles,
    marketDataServiceGetLastPrices,
} from '@wildneo/tinvest-client';
import { zV1GetCandlesRequest, zV1GetLastPricesRequest } from '@wildneo/tinvest-client/validations';
import { getCandlesFromTemplate, getLastPricesFromTemplate } from '../utils/templates.js';

export function registerMarketDataTools(server: McpServer) {
    server.registerTool(
        'get_last_prices',
        {
            title: 'Получить текущие цены последних сделок по списку инструментов',
            description: `Получить актуальные рыночные цены по списку инструментов в реальном времени.

КОГДА ИСПОЛЬЗОВАТЬ:
- При расчёте текущей стоимости позиции
- При сравнении текущей цены с целевой ценой из прогнозов
- При оценке момента входа/выхода из позиции`,
            inputSchema: zV1GetLastPricesRequest,
        },
        async (body) => {
            const { data } = await marketDataServiceGetLastPrices({ body });

            const text = await getLastPricesFromTemplate(data);

            return {
                content: [
                    {
                        type: 'text',
                        text,
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_candles',
        {
            title: 'Получить исторические свечи по инструменту',
            description: `Получить исторические данные о ценах (свечи OHLCV) по инструменту за указанный период.

КОГДА ИСПОЛЬЗОВАТЬ:
- При техническом анализе инструмента
- При анализе динамики цены за период
- При построении графиков
- При расчёте волатильности

Возвращает: открытие, максимум, минимум, закрытие, объём торгов за каждый период.`,
            inputSchema: zV1GetCandlesRequest,
        },
        async (body) => {
            const { data } = await marketDataServiceGetCandles({ body });

            const text = await getCandlesFromTemplate(data);

            return {
                content: [
                    {
                        type: 'text',
                        text,
                    },
                ],
            };
        },
    );
}
