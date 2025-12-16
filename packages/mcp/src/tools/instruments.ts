import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    instrumentsServiceBondBy,
    instrumentsServiceEtfBy,
    instrumentsServiceGetInstrumentBy,
    instrumentsServiceShareBy,
} from '@wildneo/tinvest-client';
import { zV1InstrumentRequest } from '@wildneo/tinvest-client/validations';
import {
    getBondFromTemplate,
    getEtfFromTemplate,
    getInstrumentFromTemplate,
    getShareFromTemplate,
} from '../utils/templates.js';

export function registerInstrumentTools(server: McpServer) {
    server.registerTool(
        'get_instrument_info',
        {
            title: 'Получить детальную информацию об инструменте по его идентификатору',
            description:
                'Получить детальную информацию об инструменте по его идентификатору (uid, figi или ticker_classCode, например T_TQBR)',
            inputSchema: zV1InstrumentRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceGetInstrumentBy({ body });

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
            title: 'Получить детальную информацию об акции по её идентификатору',
            description:
                'Получить детальную информацию об акции по её идентификатору (uid, figi или ticker_classCode)',
            inputSchema: zV1InstrumentRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceShareBy({ body });

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
            title: 'Получить детальную информацию об облигации по её идентификатору',
            description:
                'Получить детальную информацию об облигации по её идентификатору (uid, figi или ticker_classCode)',
            inputSchema: zV1InstrumentRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceBondBy({ body });

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
            title: 'Получить детальную информацию о фонде (ETF) по его идентификатору',
            description:
                'Получить детальную информацию о фонде (ETF) по его идентификатору (uid, figi или ticker_classCode)',
            inputSchema: zV1InstrumentRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceEtfBy({ body });

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
