import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { operationsServiceGetOperationsByCursor } from '@wildneo/tinvest-client';
import { z } from 'zod';
import { buildPortfolioSnapshot } from '../services/portfolio-snapshot.js';
import {
    getOperationsFromTemplate,
    getPortfolioSnapshotFromTemplate,
} from '../utils/templates.js';

export function registerOperationsTools(server: McpServer) {
    server.registerTool(
        'get_operations',
        {
            title: 'Получить историю операций по счёту',
            description: `Получить список операций по брокерскому счёту с фильтрацией по инструменту, периоду и статусу.

КОГДА ИСПОЛЬЗОВАТЬ:
- При просмотре истории сделок по конкретному инструменту
- При поиске конкретных операций (дивиденды, купоны, комиссии, налоги)
- При проверке исполнения заявок
- При анализе торговой активности за период

Возвращает: список операций с датами, суммами, типами и статусами.`,
            inputSchema: z.object({
                accountId: z
                    .string()
                    .describe('ID брокерского счёта. Получить через get_user_accounts.'),
                instrumentId: z
                    .string()
                    .optional()
                    .describe(
                        'UID инструмента для фильтрации. Получить через find_instrument.',
                    ),
                from: z
                    .string()
                    .optional()
                    .describe(
                        'Начало периода в формате ISO 8601 (например: 2024-01-01T00:00:00Z)',
                    ),
                to: z
                    .string()
                    .optional()
                    .describe(
                        'Окончание периода в формате ISO 8601 (например: 2024-12-31T23:59:59Z)',
                    ),
                limit: z
                    .number()
                    .min(1)
                    .max(1000)
                    .optional()
                    .default(100)
                    .describe('Количество операций (1-1000, по умолчанию 100)'),
                state: z
                    .enum([
                        'OPERATION_STATE_UNSPECIFIED',
                        'OPERATION_STATE_EXECUTED',
                        'OPERATION_STATE_CANCELED',
                        'OPERATION_STATE_PROGRESS',
                    ])
                    .optional()
                    .default('OPERATION_STATE_EXECUTED')
                    .describe('Статус операций (по умолчанию: исполненные)'),
            }),
        },
        async (params) => {
            const { data } = await operationsServiceGetOperationsByCursor({
                body: {
                    accountId: params.accountId,
                    instrumentId: params.instrumentId,
                    from: params.from,
                    to: params.to,
                    limit: params.limit,
                    state: params.state,
                },
            });

            const text = await getOperationsFromTemplate(data);

            return {
                content: [
                    {
                        text,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_portfolio_snapshot',
        {
            title: 'Получить полный снапшот портфеля с P&L',
            description: `Построить комплексный снапшот портфеля по ВСЕМ счетам пользователя за указанный период.

КОГДА ИСПОЛЬЗОВАТЬ:
- При подведении итогов за месяц/квартал/год
- При оценке общей доходности портфеля
- При анализе структуры и аллокации портфеля
- При расчёте налогового щита
- При сравнении доходов и расходов (сделки, дивиденды, купоны, комиссии, налоги)

КАК ЭТО РАБОТАЕТ:
1. Автоматически находит все активные счета пользователя
2. Загружает текущий портфель (позиции, стоимости) по каждому счёту
3. Загружает ВСЕ операции за указанный период (с пагинацией)
4. Группирует позиции по типам активов (акции, облигации, ETF)
5. Рассчитывает аллокацию, P&L, налоги, чистый результат

Возвращает: общую стоимость, аллокацию активов, таблицы позиций по типам, сводку P&L, налоговый щит, чистый результат.

ВАЖНО: Для анализа P&L обязательно укажите период (from/to). Большие периоды могут занять больше времени из-за загрузки операций.`,
            inputSchema: z.object({
                from: z
                    .string()
                    .describe(
                        'Начало периода в формате ISO 8601 (например: 2024-01-01T00:00:00Z)',
                    ),
                to: z
                    .string()
                    .describe(
                        'Окончание периода в формате ISO 8601 (например: 2024-12-31T23:59:59Z)',
                    ),
            }),
        },
        async (params) => {
            const result = await buildPortfolioSnapshot({
                from: params.from,
                to: params.to,
            });

            const text = await getPortfolioSnapshotFromTemplate(result);

            return {
                content: [
                    {
                        text,
                        type: 'text',
                    },
                ],
            };
        },
    );
}
