# K-Bot SaaS

Sistema SaaS Multi-Tenant para criação e gestão de Bots de WhatsApp e Telegram com IA Generativa.

## Funcionalidades

- **Multi-Tenant**: Admin, Revendedores e Clientes
- **WhatsApp**: Conexão via QR Code (Baileys)
- **Telegram**: Webhook ou polling
- **IA Generativa**: OpenAI, Google Gemini, Groq
- **Google Workspace**: Sheets, Calendar, Drive
- **Dashboard**: React + TypeScript

## Quick Start

### 1. Clone o repositório
```bash
git clone https://github.com/SEU_USUARIO/kbot-saas.git
cd kbot-saas
```

### 2. Execute a instalação automática (VPS Ubuntu)
```bash
chmod +x install.sh
sudo bash install.sh
```

### 3. Ou instale manualmente

```bash
# Backend
cd src/backend
cp .env.example .env
# Edite o .env com suas configurações
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev

# Bot Engine (outro terminal)
cd src/engine
cp .env.example .env
npm install
npm run dev

# Frontend (outro terminal)
cd src/frontend
npm install
npm run dev
```

## Estrutura do Projeto

```
kbot-saas/
├── src/
│   ├── backend/          # API Node.js + Fastify
│   ├── frontend/         # Dashboard React
│   └── engine/           # Motor WhatsApp/Telegram
├── prisma/               # Schema do banco
├── scripts/              # Scripts úteis
├── install.sh            # Script de instalação
└── README.md
```

## Requisitos

- Node.js 20 LTS
- PostgreSQL 15+
- Redis 7+
- Ubuntu 22.04 LTS (recomendado)

## Configuração

Edite o arquivo `.env` na pasta `src/backend/` com:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/kbot_db
JWT_SECRET=sua-chave-secreta
OPENAI_API_KEY=sua-chave-openai
GEMINI_API_KEY=sua-chave-gemini
```

## Deploy com PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Comandos Úteis

```bash
npm run status      # Ver status dos serviços
npm run logs        # Ver logs
npm run restart     # Reiniciar todos
npm run migrate     # Atualizar banco
```

## Documentação

Consulte `docs/DEPLOY.md` para instruções detalhadas de deploy.

## Licença

MIT
