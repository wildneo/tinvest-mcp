#!/usr/bin/env node

import https from 'node:https';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { client } from '@wildneo/tinvest-client';
import packageJson from '../package.json' with { type: 'json' };
import { registerAssetTools } from './tools/assets.js';
import {
    registerAccountTools,
    registerAnalyticsTools,
    registerInstrumentTools,
    registerMarketDataTools,
} from './tools/index.js';
import { registerUserTools } from './tools/user.js';

const baseURL = process.env.TINVEST_BASE_URL || 'https://invest-public-api.tbank.ru/rest';

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
});

const server = new McpServer(
    {
        name: packageJson.name,
        title: 'T-Invest API MCP Server',
        version: packageJson.version,
    },
    {
        instructions: `Это MCP-сервер для работы с T-Invest API (Т-Банк Инвестиции). Он предоставляет АКТУАЛЬНЫЕ данные о портфеле пользователя, инструментах, ценах и аналитике напрямую от брокера.

        Типичные сценарии использования:
        - Вопросы "стоит ли покупать/продавать/усреднять" → используй get_forecast (прогнозы аналитиков) и get_asset_fundamentals (P/E, P/B, ROE)
        - Вопросы о дивидендах и выборе дивидендных акций → используй get_dividends и get_asset_fundamentals
        - Анализ портфеля и позиций → используй get_account_portfolio_info и get_account_positions_info
        - Информация об инструментах → используй find_instrument (поиск по названию/тикеру), get_instrument_info, get_share_info, get_bond_info, get_etf_info
        - Текущие цены → используй get_last_prices

        Рекомендуемый порядок анализа:
        1. Сначала получи информацию о портфеле пользователя (get_account_portfolio_info)
        2. Если нужно найти инструмент по названию или тикеру, используй find_instrument
        3. Затем получи фундаментальные показатели интересующих активов (get_asset_fundamentals)
        4. Проверь прогнозы аналитиков (get_forecast)
        5. При необходимости получи данные о дивидендах (get_dividends) или купонах (get_bond_coupons)`,
    },
);

const transport = new StdioServerTransport();

const auth = () => {
    const token = process.env.TINVEST_TOKEN;

    if (!token) {
        throw new Error(
            'Warning: TINVEST_TOKEN environment variable is not set. API calls will fail.',
        );
    }

    return token;
};

async function main() {
    client.setConfig({ auth, baseURL, httpsAgent, timeout: 30000 });

    registerUserTools(server);
    registerAccountTools(server);
    registerInstrumentTools(server);
    registerAssetTools(server);
    registerMarketDataTools(server);
    registerAnalyticsTools(server);

    await server.connect(transport);

    console.error('T-Invest MCP server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
