import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    instrumentsServiceBondBy,
    instrumentsServiceEtfBy,
    instrumentsServiceFindInstrument,
    instrumentsServiceGetInstrumentBy,
    instrumentsServiceShareBy,
    V1InstrumentIdType,
} from '@wildneo/tinvest-client';
import { zV1FindInstrumentRequest } from '@wildneo/tinvest-client/validations';
import { z } from 'zod';
import {
    getBondFromTemplate,
    getEtfFromTemplate,
    getFindInstrumentFromTemplate,
    getInstrumentFromTemplate,
    getShareFromTemplate,
} from '../utils/templates.js';

export function registerInstrumentTools(server: McpServer) {
    server.registerTool(
        'find_instrument',
        {
            title: 'Найти инструмент по строке поиска',
            description: `Найти инструменты по строке поиска (название, тикер, ISIN и т.д.).

ВАЖНО: Этот инструмент возвращает UID инструмента, который нужно использовать для ВСЕХ остальных инструментов.

КАК ИСПОЛЬЗОВАТЬ:
1. Введите любую строку: название компании ("Сбербанк", "Газпром"), тикер ("SBER", "GAZP"), или ISIN
2. Опционально укажите фильтр instrumentKind для поиска конкретного типа
3. Результат содержит UID — используйте его для всех инструментов (кроме get_asset_fundamentals, для которого нужен Asset UID из детальной информации)`,
            inputSchema: zV1FindInstrumentRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceFindInstrument({ body });

            const findInstrumentInfo = await getFindInstrumentFromTemplate(data);

            return {
                content: [
                    {
                        text: findInstrumentInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_instrument_info',
        {
            title: 'Получить детальную информацию об инструменте по UID',
            description:
                'Получить детальную информацию об инструменте по UID. UID можно получить через find_instrument.',
            inputSchema: z.object({
                uid: z.string().describe('UID инструмента. Получить через find_instrument.'),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceGetInstrumentBy({
                body: { id: body.uid, idType: V1InstrumentIdType.INSTRUMENT_ID_TYPE_UID },
            });

            const instrumentInfo = await getInstrumentFromTemplate(data);

            return {
                content: [
                    {
                        text: instrumentInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_share_info',
        {
            title: 'Получить детальную информацию об акции по UID',
            description:
                'Получить детальную информацию об акции по UID. UID можно получить через find_instrument. Возвращает Asset UID для использования в get_asset_fundamentals.',
            inputSchema: z.object({
                uid: z.string().describe('UID акции. Получить через find_instrument.'),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceShareBy({
                body: { id: body.uid, idType: V1InstrumentIdType.INSTRUMENT_ID_TYPE_UID },
            });

            const shareInfo = await getShareFromTemplate(data);

            return {
                content: [
                    {
                        text: shareInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_bond_info',
        {
            title: 'Получить детальную информацию об облигации по UID',
            description:
                'Получить детальную информацию об облигации по UID. UID можно получить через find_instrument. Возвращает Asset UID для использования в get_asset_fundamentals.',
            inputSchema: z.object({
                uid: z.string().describe('UID облигации. Получить через find_instrument.'),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceBondBy({
                body: { id: body.uid, idType: V1InstrumentIdType.INSTRUMENT_ID_TYPE_UID },
            });

            const bondInfo = await getBondFromTemplate(data);

            return {
                content: [
                    {
                        text: bondInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_etf_info',
        {
            title: 'Получить детальную информацию о фонде (ETF) по UID',
            description:
                'Получить детальную информацию о фонде (ETF) по UID. UID можно получить через find_instrument. Возвращает Asset UID для использования в get_asset_fundamentals.',
            inputSchema: z.object({
                uid: z.string().describe('UID фонда. Получить через find_instrument.'),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceEtfBy({
                body: { id: body.uid, idType: V1InstrumentIdType.INSTRUMENT_ID_TYPE_UID },
            });

            const etfInfo = await getEtfFromTemplate(data);

            return {
                content: [
                    {
                        text: etfInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );
}
