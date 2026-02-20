import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buildOfzCouponCalendar } from '../services/ofz-calendar.js';
import { getOfzCouponCalendarFromTemplate } from '../utils/templates.js';

export function registerCalendarTools(server: McpServer) {
    server.registerTool(
        'build_ofz_coupon_calendar',
        {
            title: 'Построить купонный календарь из ОФЗ-ПД',
            description: `Автоматически подобрать портфель из 6 ОФЗ-ПД с ежемесячными купонными выплатами.

КАК ЭТО РАБОТАЕТ:
1. Загружает все доступные облигации
2. Фильтрует только ОФЗ-ПД (фиксированный купон, 2 выплаты в год)
3. Получает текущие цены и рассчитывает YTM
4. Группирует по месяцам купонных выплат
5. Выбирает лучшие 6 облигаций для покрытия всех 12 месяцев

СТРАТЕГИИ:
- max_ytm: выбирает облигации с максимальной доходностью к погашению
- max_coupon: выбирает облигации с максимальным размером купона
- balanced: комбинированный скор (YTM + текущая доходность)

Возвращает: таблицу выбранных облигаций, календарь выплат по месяцам, сводку портфеля.`,
            inputSchema: z.object({
                strategy: z
                    .enum(['max_ytm', 'max_coupon', 'balanced'])
                    .default('max_ytm')
                    .describe('Стратегия выбора облигаций'),
                minYearsToMaturity: z
                    .number()
                    .default(2)
                    .describe('Минимальный срок до погашения (лет)'),
                maxYearsToMaturity: z
                    .number()
                    .default(15)
                    .describe('Максимальный срок до погашения (лет)'),
                includeSpeculative: z
                    .boolean()
                    .default(false)
                    .describe(
                        'Включить секцию спекулятивных позиций (ставка на снижение ставки ЦБ)',
                    ),
            }),
        },
        async (params) => {
            const {
                strategy = 'max_ytm',
                minYearsToMaturity = 2,
                maxYearsToMaturity = 15,
                includeSpeculative = false,
            } = params;

            const result = await buildOfzCouponCalendar({
                strategy,
                minYearsToMaturity,
                maxYearsToMaturity,
                includeSpeculative,
            });

            if (!result) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Не найдено подходящих ОФЗ-ПД с заданными параметрами.',
                        },
                    ],
                };
            }

            const text = await getOfzCouponCalendarFromTemplate(result);

            return {
                content: [{ type: 'text', text }],
            };
        },
    );
}
