# ============================================
# K-BOT SaaS - Instalação Completa para VPS
# Execute este script no servidor Ubuntu 22.04
# ============================================

set -e

echo "=========================================="
echo "K-BOT SaaS - Instalação Automática"
echo "=========================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}[PASSO]${NC} $1"
}

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
    echo "Por favor, execute como root: sudo bash install.sh"
    exit 1
fi

# ============================================
# PASSO 1: Atualizar Sistema
# ============================================
print_step "Atualizando sistema..."
apt update && apt upgrade -y

# ============================================
# PASSO 2: Instalar Node.js 20 LTS
# ============================================
print_step "Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v

# ============================================
# PASSO 3: Instalar PostgreSQL
# ============================================
print_step "Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib

systemctl enable postgresql
systemctl start postgresql

# Criar banco de dados
sudo -u postgres psql -c "CREATE USER kbot WITH PASSWORD 'KBot2024!Secure';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE kbot_db OWNER kbot;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER kbot CREATEDB;" 2>/dev/null || true

echo "PostgreSQL instalado com sucesso!"

# ============================================
# PASSO 4: Instalar Redis
# ============================================
print_step "Instalando Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# ============================================
# PASSO 5: Instalar Nginx
# ============================================
print_step "Instalando Nginx..."
apt install -y nginx
systemctl enable nginx

# ============================================
# PASSO 6: Instalar PM2
# ============================================
print_step "Instalando PM2..."
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# ============================================
# PASSO 7: Instalar dependências do projeto
# ============================================
print_step "Instalando dependências do projeto..."
npm install

# ============================================
# PASSO 8: Configurar Prisma
# ============================================
print_step "Configurando Prisma..."
npx prisma generate
npx prisma migrate deploy

# ============================================
# PASSO 9: Criar usuário admin inicial
# ============================================
print_step "Criando usuário admin..."
node scripts/create-admin.js 2>/dev/null || echo "Execute manualmente: npm run create-admin"

# ============================================
# PASSO 10: Configurar Nginx
# ============================================
print_step "Configurando Nginx..."
cat > /etc/nginx/sites-available/kbot-saas << 'EOF'
server {
    listen 80;
    server_name SEU_DOMINIO_OU_IP;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Bot Engine WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/kbot-saas /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ============================================
# PASSO 11: Iniciar serviços com PM2
# ============================================
print_step "Iniciando serviços com PM2..."

# Backend
pm2 start src/backend/index.js --name kbot-api

# Bot Engine
pm2 start src/engine/index.js --name kbot-engine

# Frontend
pm2 start --name kbot-frontend npm -- run dev --prefix src/frontend

# Salvar configuração PM2
pm2 save
pm2 startup

# ============================================
# FINALIZAÇÃO
# ============================================
echo ""
echo "=========================================="
echo -e "${GREEN}INSTALAÇÃO CONCLUÍDA!${NC}"
echo "=========================================="
echo ""
echo "Acesse:"
echo "  Frontend: http://SEU_DOMINIO_OU_IP:5173"
echo "  API: http://SEU_DOMINIO_OU_IP:3000"
echo ""
echo "Comandos úteis:"
echo "  pm2 status          - Ver status dos serviços"
echo "  pm2 logs           - Ver logs"
echo "  pm2 restart all    - Reiniciar todos"
echo ""
echo "Próximos passos:"
echo "  1. Edite o arquivo .env com suas configurações"
echo "  2. Configure suas chaves de API (OpenAI, Gemini, etc)"
echo "  3. (Opcional) Configure SSL: sudo certbot --nginx"
echo ""
