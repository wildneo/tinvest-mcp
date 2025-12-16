import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { usersServiceGetAccounts, usersServiceGetInfo } from '@wildneo/tinvest-client';
import { zV1GetAccountsRequest } from '@wildneo/tinvest-client/validations';
import { getAccountsFromTemplate, getUserInfoFromTemplate } from '../utils/templates.js';

export function registerUserTools(server: McpServer) {
    server.registerTool(
        'get_user_info',
        {
            title: 'Получить информацию о текущем пользователе',
            description:
                'Получить информацию о пользователе: тариф, признак квалификации, пройденные тесты, категория риска и др.',
        },
        async () => {
            const { data } = await usersServiceGetInfo({ body: {} });

            const userInfo = await getUserInfoFromTemplate(data);

            return {
                content: [
                    {
                        text: userInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_user_accounts',
        {
            title: 'Получить список брокерских счетов',
            description:
                'Получить список брокерских счетов пользователя: название, ID, тип, статус, дата открытия, дата закрытия, уровень доступа.',
            inputSchema: zV1GetAccountsRequest,
        },
        async (body) => {
            const { data } = await usersServiceGetAccounts({ body });
            const accountsInfo = await getAccountsFromTemplate(data);
            return {
                content: [
                    {
                        text: accountsInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );
}
