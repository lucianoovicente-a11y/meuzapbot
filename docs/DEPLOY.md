# ============================================
# K-BOT SaaS - INSTRUÇÕES DE DEPLOY
# ============================================

## REQUISITOS DO SERVIDOR

- Ubuntu 22.04 LTS (recomendado)
- 2GB RAM mínimo (4GB recomendado)
- 20GB disco
- Node.js 20 LTS
- PostgreSQL 15+
- Redis 7+
- Nginx
- PM2

---

## INSTALAÇÃO AUTOMÁTICA (RECOMENDADO)

### 1. Clone o repositório no VPS

```bash
cd /var/www
git clone https://github.com/SEU_USUARIO/kbot-saas.git kbot
cd kbot
```

### 2. Execute o script de instalação

```bash
chmod +x install.sh
sudo bash install.sh
```

O script vai:
- Instalar Node.js 20
- Instalar PostgreSQL e criar banco
- Instalar Redis
- Instalar Nginx
- Instalar PM2
- Instalar dependências do projeto
- Configurar Prisma
- Configurar Nginx
- Iniciar serviços com PM2

### 3. Configure o .env

```bash
cd /var/www/kbot/src/backend
nano .env
```

Edite com suas configurações:
```env
DATABASE_URL=postgresql://kbot:KBot2024!Secure@localhost:5432/kbot_db
JWT_SECRET=sua-chave-secreta-muito-longa
OPENAI_API_KEY=sua-chave-openai
GEMINI_API_KEY=sua-chave-gemini
```

### 4. Crie o admin

```bash
cd /var/www/kbot
node scripts/create-admin.js
```

### 5. Acesse o sistema

- Frontend: http://SEU_IP:5173
- API: http://SEU_IP:3000
- Login: admin@kbot.com / admin123

---

## INSTALAÇÃO MANUAL

### 1. Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Instalar PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER kbot WITH PASSWORD 'KBot2024!Secure';"
sudo -u postgres psql -c "CREATE DATABASE kbot_db OWNER kbot;"
```

### 3. Instalar Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

### 4. Instalar PM2

```bash
sudo npm install -g pm2
```

### 5. Instalar dependências

```bash
cd src/backend
npm install
cd ../engine
npm install
cd ../frontend
npm install
```

### 6. Configurar Prisma

```bash
cd src/backend
npx prisma generate
npx prisma migrate deploy
```

### 7. Iniciar serviços

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## CONFIGURAÇÃO DO NGINX

O Nginx já é configurado pelo install.sh. Se quiser configurar manualmente:

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /api {
        proxy_pass http://localhost:3000;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

---

## SSL (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU_DOMINIO
```

---

## COMANDOS ÚTEIS

```bash
pm2 status          # Ver status
pm2 logs            # Ver logs
pm2 restart all     # Reiniciar tudo
pm2 monit          # Monitorar

# Atualizar código
git pull origin main
npm run migrate
pm2 restart all
```

---

## CONFIGURAÇÃO DE IAs

### OpenAI
1. Acesse https://platform.openai.com/api-keys
2. Crie uma chave API
3. Cole no .env: `OPENAI_API_KEY=sk-...`

### Google Gemini
1. Acesse https://makersuite.google.com/app/apikey
2. Gere uma API Key
3. Cole no .env: `GEMINI_API_KEY=...`

### Groq
1. Acesse https://console.groq.com/keys
2. Crie uma chave
3. Cole no .env: `GROQ_API_KEY=...`

---

## SOLUÇÃO DE PROBLEMAS

**QR Code não aparece?**
- Verifique se o Bot Engine está rodando: `pm2 status`
- Verifique logs: `pm2 logs kbot-engine`

**Erro de conexão com banco?**
- Verifique se PostgreSQL está rodando: `sudo systemctl status postgresql`
- Teste conexão: `psql -U kbot -d kbot_db`

**WhatsApp desconecta?**
- Aumente o keepAlive no engine
- Verifique estabilidade da rede
