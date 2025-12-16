# @wildneo/tinvest-mcp

MCP-сервер для интеграции [T-Invest API](https://www.tbank.ru/invest/) с AI-ассистентами через протокол [Model Context Protocol](https://modelcontextprotocol.io/).

## Возможности

Сервер предоставляет 16 инструментов для работы с T-Invest API:

### Пользователь

- `get_user_info` — информация о пользователе (тариф, квалификация, тесты)
- `get_user_accounts` — список брокерских счетов

### Счета

- `get_account_portfolio_info` — портфель по счёту (стоимость активов, позиции)
- `get_account_positions_info` — позиции в портфеле (инструменты, валюты, фьючерсы)

### Инструменты

- `get_instrument_info` — информация об инструменте по идентификатору
- `get_share_info` — детальная информация об акции
- `get_bond_info` — детальная информация об облигации
- `get_etf_info` — детальная информация о фонде (ETF)

### Активы

- `get_asset_info` — информация об активе по UID

### Рыночные данные

- `get_last_prices` — текущие цены последних сделок
- `get_candles` — исторические свечи (OHLCV) по инструменту

### Аналитика

- `get_dividends` — дивиденды по акции за период
- `get_bond_coupons` — график выплат купонов по облигации
- `get_accrued_interests` — накопленный купонный доход (НКД)
- `get_forecast` — прогнозы инвестдомов по инструменту
- `get_asset_fundamentals` — фундаментальные показатели актива

## Настройка

### Переменные окружения

| Переменная         | Описание                                                                  | Обязательная |
| ------------------ | ------------------------------------------------------------------------- | ------------ |
| `TINVEST_TOKEN`    | Токен доступа к T-Invest API                                              | Да           |
| `TINVEST_BASE_URL` | Базовый URL API (по умолчанию: `https://invest-public-api.tbank.ru/rest`) | Нет          |

### Получение токена

1. Откройте [настройки T-Invest](https://www.tbank.ru/invest/settings/)
2. Перейдите в раздел «Токены для API»
3. Создайте новый токен с необходимыми правами

## Интеграция с MCP-клиентами

### Claude Desktop

Добавьте в `claude_desktop_config.json`:

```json
{
    "mcpServers": {
        "tinvest": {
            "command": "node",
            "args": ["<абсолютный-путь-до-директории>/packages/mcp/dist/index.js"],
            "env": {
                "TINVEST_TOKEN": "ваш_токен"
            }
        }
    }
}
```

### MCP Inspector

Для отладки используйте MCP Inspector:

```bash
# Из корня монорепозитория
pnpm inspect:tinvest
```

## Лицензия

MIT
