# Node.js Backend Engineer Skill

Універсальний Agent Skill для **Claude Code**, **Codex** та інших клієнтів, що підтримують відкритий формат Agent Skills.

Skill написаний англійською, щоб інструкції стабільно працювали в різних coding agents. Він не нав'язує конкретний framework, ORM або базу даних: агент спочатку аналізує поточний проєкт, а потім застосовує відповідні практики.

## Що входить

- Node.js, TypeScript, ESM/CommonJS, async I/O, streams, graceful shutdown
- Express, Fastify, NestJS, Koa/Hapi та сумісні frameworks
- REST, GraphQL, webhooks, workers, queues, scheduled jobs, CLI
- PostgreSQL, MySQL, MongoDB, Redis
- Prisma, TypeORM, Drizzle, Sequelize, Knex, Mongoose та native drivers
- API design, validation, authentication, authorization, security
- migrations, transactions, indexes, concurrency, idempotency
- testing, observability, performance, caching, deployment
- режим implementation, debugging, architecture та code review
- read-only scripts для швидкого аналізу Node.js repository

## Структура

```text
nodejs-backend-engineer/
├── SKILL.md
├── README.md
├── LICENSE
├── CHANGELOG.md
├── agents/
│   └── openai.yaml
├── scripts/
│   ├── inspect-project.mjs
│   ├── audit-project.mjs
│   ├── install.sh
│   └── install.ps1
├── references/
│   ├── architecture-workflow.md
│   ├── node-typescript.md
│   ├── frameworks.md
│   ├── databases.md
│   ├── migrations-transactions.md
│   ├── api-security.md
│   ├── testing-quality.md
│   ├── observability-performance.md
│   ├── deployment-operations.md
│   ├── review-checklists.md
│   ├── node-patterns.md
│   └── official-sources.md
└── assets/
    ├── implementation-plan-template.md
    └── service-design-template.md
```

## Встановлення для обох агентів на macOS/Linux

Розпакуй ZIP, відкрий Terminal у папці `nodejs-backend-engineer` та виконай:

```bash
chmod +x scripts/install.sh
./scripts/install.sh --global --both
```

Інсталятор не перезаписує наявну копію без явного `--force`, щоб не втратити локальні зміни.

Це скопіює skill у:

```text
~/.claude/skills/nodejs-backend-engineer
~/.agents/skills/nodejs-backend-engineer
```

### Встановлення тільки в конкретний repository

```bash
./scripts/install.sh --project --both /absolute/path/to/repository
```

Skill буде встановлено у:

```text
<repo>/.claude/skills/nodejs-backend-engineer
<repo>/.agents/skills/nodejs-backend-engineer
```

Repo-specific варіант можна commit-нути, щоб skill використовувала вся команда. Скрипт створює дві копії для максимальної сумісності між агентами.

## Windows PowerShell

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install.ps1 -Scope Global -Agent Both
```

Для свідомої заміни наявної копії додай `-Force`.

Для repository:

```powershell
.\scripts\install.ps1 -Scope Project -Agent Both -ProjectRoot "C:\work\my-project"
```

## Ручне встановлення

### Claude Code

```bash
mkdir -p ~/.claude/skills
cp -R nodejs-backend-engineer ~/.claude/skills/nodejs-backend-engineer
```

### Codex

```bash
mkdir -p ~/.agents/skills
cp -R nodejs-backend-engineer ~/.agents/skills/nodejs-backend-engineer
```

## Використання

Claude Code:

```text
/nodejs-backend-engineer Implement a secure endpoint for creating employees.
```

Codex CLI або IDE:

```text
$nodejs-backend-engineer Review this Node.js API and fix transaction handling.
```

Обидва агенти також можуть активувати skill автоматично за її `description`.

## Допоміжні scripts

Статичний огляд repository без встановлення dependencies:

```bash
node scripts/inspect-project.mjs /path/to/repository
node scripts/audit-project.mjs /path/to/repository
```

JSON output:

```bash
node scripts/inspect-project.mjs /path/to/repository --json
node scripts/audit-project.mjs /path/to/repository --json
```

Scripts не запускають package scripts, не встановлюють dependencies і не читають значення secrets. У monorepo вони розрізняють корінь workspace і вибраний package; запуск із кореня також агрегує stack із вкладених workspace packages.

## Налаштування під команду

Найкраще залишити універсальні правила в цьому skill, а project-specific правила додати в repository-level `AGENTS.md`, `CLAUDE.md` або окремий вузький skill. Наприклад:

- точні команди test/build/lint
- naming conventions
- folder architecture
- approved packages
- API error format
- migration and deployment process
- security requirements конкретного продукту

## Оновлення

Повторно запусти install script із нової версії папки та додай `--force` у Bash або `-Force` у PowerShell. Без цього інсталятор відмовиться замінювати наявну копію.
