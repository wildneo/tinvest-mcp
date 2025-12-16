import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { instrumentsServiceGetAssetBy } from '@wildneo/tinvest-client';
import { zV1AssetRequest } from '@wildneo/tinvest-client/validations';
import { getAssetFromTemplate } from '../utils/templates.js';

export function registerAssetTools(server: McpServer) {
    server.registerTool(
        'get_asset_info',
        {
            title: 'Получить детальную информацию об активе по его идентификатору',
            description: 'Получить детальную информацию об активе по его идентификатору (uid)',
            inputSchema: zV1AssetRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceGetAssetBy({ body });

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
