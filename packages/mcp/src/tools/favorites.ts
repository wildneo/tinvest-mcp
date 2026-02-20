import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    instrumentsServiceCreateFavoriteGroup,
    instrumentsServiceDeleteFavoriteGroup,
    instrumentsServiceEditFavorites,
    instrumentsServiceGetFavoriteGroups,
    instrumentsServiceGetFavorites,
} from '@wildneo/tinvest-client';
import {
    zV1CreateFavoriteGroupRequest,
    zV1EditFavoritesRequest,
    zV1GetFavoriteGroupsRequest,
    zV1GetFavoritesRequest,
} from '@wildneo/tinvest-client/validations';
import { z } from 'zod';
import {
    getEditFavoritesResultFromTemplate,
    getFavoriteGroupResultFromTemplate,
    getFavoriteGroupsFromTemplate,
    getFavoritesFromTemplate,
} from '../utils/templates.js';

export function registerFavoritesTools(server: McpServer) {
    server.registerTool(
        'get_favorites',
        {
            title: 'Получить список избранных инструментов',
            description: `Получить список избранных инструментов пользователя.

Опционально можно указать groupId для получения инструментов конкретной группы.
Для получения списка групп используй get_favorite_groups.`,
            inputSchema: zV1GetFavoritesRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceGetFavorites({ body });

            const favoritesInfo = await getFavoritesFromTemplate(data);

            return {
                content: [
                    {
                        text: favoritesInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'get_favorite_groups',
        {
            title: 'Получить список групп избранного',
            description: `Получить список групп избранных инструментов.

Опциональные параметры:
- instrumentId: массив идентификаторов инструментов (figi или uid) для проверки наличия в группах
- excludedGroupId: массив идентификаторов групп для исключения из ответа`,
            inputSchema: zV1GetFavoriteGroupsRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceGetFavoriteGroups({ body });

            const groupsInfo = await getFavoriteGroupsFromTemplate(data);

            return {
                content: [
                    {
                        text: groupsInfo,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'edit_favorites',
        {
            title: 'Добавить или удалить инструменты из избранного',
            description: `Добавить или удалить инструменты из списка избранных.

Параметры:
- instruments: массив объектов с instrumentId (figi или uid инструмента)
- actionType: действие — EDIT_FAVORITES_ACTION_TYPE_ADD (добавить) или EDIT_FAVORITES_ACTION_TYPE_DEL (удалить)
- groupId (опционально): ID группы, в которую добавить/из которой удалить

Пример instruments: [{ "instrumentId": "BBG004730N88" }]`,
            inputSchema: zV1EditFavoritesRequest,
        },
        async (body) => {
            const { data } = await instrumentsServiceEditFavorites({ body });

            const editResult = await getEditFavoritesResultFromTemplate(data);

            return {
                content: [
                    {
                        text: editResult,
                        type: 'text',
                    },
                ],
            };
        },
    );

    server.registerTool(
        'edit_favorite_group',
        {
            title: 'Создать или удалить группу избранного',
            description: `Создать новую группу избранных инструментов или удалить существующую.

Параметры:
- action: "create" для создания или "delete" для удаления группы

Для создания (action = "create"):
- groupName: название группы (обязательно, до 255 символов)
- groupColor: цвет в HEX-формате без # (обязательно, например "FF5733")
- note: описание группы (опционально)

Для удаления (action = "delete"):
- groupId: ID группы для удаления (обязательно)`,
            inputSchema: z.object({
                action: z.enum(['create', 'delete']).describe('Действие: create или delete'),
                groupName: z
                    .string()
                    .max(255)
                    .optional()
                    .describe('Название группы (для create, до 255 символов)'),
                groupColor: z
                    .string()
                    .optional()
                    .describe('Цвет в HEX-формате без #, например FF5733 (для create)'),
                note: z.string().optional().describe('Описание группы (для create)'),
                groupId: z.string().optional().describe('ID группы (для delete)'),
            }),
        },
        async (body) => {
            if (body.action === 'create') {
                if (!body.groupName || !body.groupColor) {
                    return {
                        content: [
                            {
                                text: 'Ошибка: для создания группы необходимо указать groupName и groupColor',
                                type: 'text',
                            },
                        ],
                        isError: true,
                    };
                }

                const createBody = {
                    groupName: body.groupName,
                    groupColor: body.groupColor,
                    note: body.note,
                };

                const { data } = await instrumentsServiceCreateFavoriteGroup({ body: createBody });

                const result = await getFavoriteGroupResultFromTemplate({
                    action: 'create',
                    groupId: data.groupId,
                    groupName: data.groupName,
                    success: true,
                });

                return {
                    content: [
                        {
                            text: result,
                            type: 'text',
                        },
                    ],
                };
            }

            if (body.action === 'delete') {
                if (!body.groupId) {
                    return {
                        content: [
                            {
                                text: 'Ошибка: для удаления группы необходимо указать groupId',
                                type: 'text',
                            },
                        ],
                        isError: true,
                    };
                }

                await instrumentsServiceDeleteFavoriteGroup({ body: { groupId: body.groupId } });

                const result = await getFavoriteGroupResultFromTemplate({
                    action: 'delete',
                    groupId: body.groupId,
                    success: true,
                });

                return {
                    content: [
                        {
                            text: result,
                            type: 'text',
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        text: 'Ошибка: неизвестное действие',
                        type: 'text',
                    },
                ],
                isError: true,
            };
        },
    );
}
