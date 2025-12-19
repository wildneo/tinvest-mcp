import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { instrumentsServiceGetAssetBy } from '@wildneo/tinvest-client';
import { z } from 'zod';
import { getAssetFromTemplate } from '../utils/templates.js';

export function registerAssetTools(server: McpServer) {
    server.registerTool(
        'get_asset_info',
        {
            title: 'Получить детальную информацию об активе по Asset UID',
            description:
                'Получить детальную информацию об активе по Asset UID. Asset UID можно получить через find_instrument.',
            inputSchema: z.object({
                assetUid: z
                    .string()
                    .describe('Asset UID актива. Получить через find_instrument (поле Asset UID).'),
            }),
        },
        async (body) => {
            const { data } = await instrumentsServiceGetAssetBy({ body: { id: body.assetUid } });

            const assetInfo = await getAssetFromTemplate(data);

            return {
                content: [
                    {
                        text: assetInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );
}
