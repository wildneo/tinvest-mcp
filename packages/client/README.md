# @wildneo/tinvest-client

TypeScript клиент для [T-Invest API](https://www.tbank.ru/invest/), сгенерированный из OpenAPI спецификации.

## Установка

```bash
pnpm add @wildneo/tinvest-client axios zod
```

## Использование

```typescript
import { client, usersServiceGetInfo } from '@wildneo/tinvest-client';

// Настройка клиента
client.setConfig({
  auth: () => 'ваш_токен',
  baseURL: 'https://invest-public-api.tbank.ru/rest',
});

// Получение информации о пользователе
const { data } = await usersServiceGetInfo({ body: {} });
console.log(data);
```

## Экспорты

| Путь | Описание |
|------|----------|
| `@wildneo/tinvest-client` | Основной клиент и сервисы |
| `@wildneo/tinvest-client/validations` | Zod-схемы для валидации |

## Генерация клиента

Клиент генерируется из OpenAPI спецификации T-Invest API:

```bash
pnpm generate
```

## Лицензия

MIT

