# Abyss Corp

Підводний idle/tycoon: розвивай базу, автоматизуй виробництво й відкривай нові глибини.

[Грати](https://abyss-corp.netlify.app/) · [База даних](https://abyss-corp.netlify.app/database) · [Статистика](https://abyss-corp.netlify.app/analytics) — лише для адміністратора.

## Локальний запуск

Node.js 24+. Якщо `.env.local` ще немає, створи його за `.env.example` з параметрами Supabase.

```sh
npm ci
npm run dev
```

```sh
npm run check   # TypeScript, ESLint, форматування
npm run build  # production-збірка
```

## Деплой

Push у `main` → Netlify автоматично збирає `dist`. Конфігурація вже в `netlify.toml`.

Акаунти й прогрес — Supabase. Листи — Brevo Free. Статистика за згодою — PostHog EU.

[Налаштування та безпека](docs/deployment.md) · [Архітектура](docs/architecture.md)
