import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    marketDataServiceGetCandles,
    marketDataServiceGetLastPrices,
    V1CandleInterval,
} from '@wildneo/tinvest-client';
import { z } from 'zod';
import { getCandlesFromTemplate, getLastPricesFromTemplate } from '../utils/templates.js';

export function registerMarketDataTools(server: McpServer) {
    server.registerTool(
        'get_last_prices',
        {
            title: 'Получить текущие цены последних сделок по списку инструментов',
            description: `Получить актуальные рыночные цены по массиву UID инструментов в реальном времени.

КОГДА ИСПОЛЬЗОВАТЬ:
- При расчёте текущей стоимости позиции
- При сравнении текущей цены с целевой ценой из прогнозов
- При оценке момента входа/выхода из позиции`,
            inputSchema: z.object({
                uids: z
                    .array(z.string())
                    .optional()
                    .describe('Массив UID инструментов. Получить через find_instrument.'),
            }),
        },
        async (body) => {
            const { data } = await marketDataServiceGetLastPrices({
                body: { instrumentId: body.uids },
            });

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
            description: `Получить исторические данные о ценах (свечи OHLCV) по UID инструмента за указанный период.

КОГДА ИСПОЛЬЗОВАТЬ:
- При техническом анализе инструмента
- При анализе динамики цены за период
- При построении графиков
- При расчёте волатильности

Возвращает: открытие, максимум, минимум, закрытие, объём торгов за каждый период.`,
            inputSchema: z.object({
                uid: z.string().describe('UID инструмента. Получить через find_instrument.'),
                from: z
                    .string()
                    .describe('Начало периода в формате ISO 8601 (например: 2024-01-01T00:00:00Z)'),
                to: z
                    .string()
                    .describe(
                        'Окончание периода в формате ISO 8601 (например: 2024-12-31T23:59:59Z)',
                    ),
                interval: z
                    .enum([
                        V1CandleInterval.CANDLE_INTERVAL_UNSPECIFIED,
                        V1CandleInterval.CANDLE_INTERVAL_1_MIN,
                        V1CandleInterval.CANDLE_INTERVAL_5_MIN,
                        V1CandleInterval.CANDLE_INTERVAL_15_MIN,
                        V1CandleInterval.CANDLE_INTERVAL_HOUR,
                        V1CandleInterval.CANDLE_INTERVAL_DAY,
                        V1CandleInterval.CANDLE_INTERVAL_2_MIN,
                        V1CandleInterval.CANDLE_INTERVAL_3_MIN,
                        V1CandleInterval.CANDLE_INTERVAL_10_MIN,
                        V1CandleInterval.CANDLE_INTERVAL_30_MIN,
                        V1CandleInterval.CANDLE_INTERVAL_2_HOUR,
                        V1CandleInterval.CANDLE_INTERVAL_4_HOUR,
                        V1CandleInterval.CANDLE_INTERVAL_WEEK,
                        V1CandleInterval.CANDLE_INTERVAL_MONTH,
                    ])
                    .describe('Интервал свечи'),
            }),
        },
        async (body) => {
            const { data } = await marketDataServiceGetCandles({
                body: {
                    instrumentId: body.uid,
                    from: body.from,
                    to: body.to,
                    interval: body.interval,
                },
            });

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
