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

Рекомендуемый порядок анализа:
1. Если нужен конкретный инструмент — ОБЯЗАТЕЛЬНО начни с find_instrument (получишь UID инструмента)
2. Используй UID инструмента для: get_instrument_info, get_share_info, get_bond_info, get_etf_info, get_dividends, get_forecast, get_last_prices, get_candles, get_bond_coupons, get_accrued_interests
3. Для фундаментальных показателей: сначала получи Asset UID через get_share_info/get_bond_info/get_etf_info, затем используй get_asset_fundamentals
4. Проверь прогнозы аналитиков (get_forecast с UID инструмента)
5. При необходимости получи данные о дивидендах (get_dividends с UID) или купонах (get_bond_coupons с UID)`,
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
