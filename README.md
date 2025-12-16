# T-Invest MCP

Монорепозиторий с MCP-сервером и TypeScript клиентом для работы с [T-Invest API](https://www.tbank.ru/invest/).

## Пакеты

| Пакет | Описание |
|-------|----------|
| [@wildneo/tinvest-mcp](./packages/mcp) | MCP-сервер для интеграции T-Invest API с AI-ассистентами |
| [@wildneo/tinvest-client](./packages/client) | TypeScript клиент для T-Invest API |

## Требования

- Node.js >= 20
- pnpm

## Быстрый старт

```bash
# Клонирование репозитория
git clone https://github.com/wildneo/tinvest-mcp.git
cd tinvest-mcp

# Установка зависимостей
pnpm install

# Сборка всех пакетов
pnpm build
```

## Разработка

```bash
# Запуск MCP Inspector для отладки
pnpm inspect:tinvest
```

## Лицензия

MIT

