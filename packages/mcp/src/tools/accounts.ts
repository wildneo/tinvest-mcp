import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    operationsServiceGetPortfolio,
    operationsServiceGetPositions,
} from '@wildneo/tinvest-client';
import { zV1PortfolioRequest, zV1PositionsRequest } from '@wildneo/tinvest-client/validations';
import { getPortfolioFromTemplate, getPositionsFromTemplate } from '../utils/templates.js';

export function registerAccountTools(server: McpServer) {
    server.registerTool(
        'get_account_portfolio_info',
        {
            title: 'Получить информацию о портфеле по счёту',
            description:
                'Получить информацию о портфеле по счёту: общая стоимость активов, стоимость валюты, стоимость акций, стоимость облигаций, стоимость ETF, стоимость фьючерсов, стоимость опционов и список позиций в портфеле.',
            inputSchema: zV1PortfolioRequest,
        },
        async (body) => {
            const { data } = await operationsServiceGetPortfolio({ body });

            const portfolioInfo = await getPortfolioFromTemplate(data);

            return {
                content: [
                    {
                        text: portfolioInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_account_positions_info',
        {
            title: 'Получить информацию о позициях в портфеле по счёту',
            description:
                'Получить информацию о позициях в портфеле по счёту: список позиций (инструментов) в портфеле, список валютных позиций, список фьючерсов, список опционов.',
            inputSchema: zV1PositionsRequest,
        },
        async (body) => {
            const { data } = await operationsServiceGetPositions({ body });

            const positionsInfo = await getPositionsFromTemplate(data);

            return {
                content: [
                    {
                        text: positionsInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );
}
