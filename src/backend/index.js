import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

const prisma = new PrismaClient();

// Configurar CORS
fastify.register(cors, {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
});

// Configurar Rate Limit
fastify.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000
});

// Configurar WebSocket
fastify.register(websocket);

// Configurar JWT
fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'kbot-secret-key-change-in-production',
  sign: {
    expiresIn: '7d'
  }
});

// Decorator para Prisma
fastify.decorate('prisma', prisma);

// Middleware de autenticação
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Não autorizado' });
  }
});

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0'
}));

// ==================== AUTH ROUTES ====================

// Registro de usuário
fastify.post('/api/auth/register', async (request, reply) => {
  try {
    const { name, email, password, role = 'reseller' } = request.body;
    
    if (!name || !email || !password) {
      return reply.status(400).send({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role === 'admin' ? 'admin' : 'reseller'
      }
    });

    const token = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return reply.status(201).send({ 
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token 
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Erro ao criar usuário' });
  }
});

// Login de usuário
fastify.post('/api/auth/login', async (request, reply) => {
  try {
    const { email, password } = request.body;
    
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email e senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return reply.status(401).send({ error: 'Credenciais inválidas' });
    }

    if (!user.isActive) {
      return reply.status(403).send({ error: 'Usuário inativo' });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return { 
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token 
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Erro ao fazer login' });
  }
});

// Login com Google (OAuth2)
fastify.post('/api/auth/google', async (request, reply) => {
  try {
    const { tokenId, email, name, picture } = request.body;
    
    if (!email) {
      return reply.status(400).send({ error: 'Email é obrigatório' });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Criar usuário automaticamente
      const randomPassword = uuidv4();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      user = await prisma.user.create({
        data: {
          name: name || email.split('@')[0],
          email,
          password: hashedPassword,
          role: 'reseller'
        }
      });
    }

    if (!user.isActive) {
      return reply.status(403).send({ error: 'Usuário inativo' });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return { 
      user: { id: user.id, name: user.name, email: user.email, role: user.role, picture },
      token 
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Erro no login com Google' });
  }
});

// Logout (apenas invalida o token no client-side)
fastify.post('/api/auth/logout', async (request, reply) => {
  return { message: 'Logout realizado com sucesso' };
});

// Recuperar dados do usuário autenticado
fastify.get('/api/auth/me', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        include: {
          subscriptions: true,
          clients: true,
          _count: {
            select: { children: true }
          }
        }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          subscriptions: user.subscriptions,
          clientsCount: user.clients.length,
          resellersCount: user._count.children
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar dados do usuário' });
    }
  }
});

// ==================== USERS ROUTES ====================

// Listar usuários (apenas admin)
fastify.get('/api/users', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      if (user.role !== 'admin') {
        return reply.status(403).send({ error: 'Acesso não permitido' });
      }

      const users = await prisma.user.findMany({
        include: { 
          subscriptions: true,
          _count: { select: { children: true, clients: true } }
        }
      });
      return users;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar usuários' });
    }
  }
});

// ==================== CLIENTS ROUTES ====================

// Listar clientes do usuário logado
fastify.get('/api/clients', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      
      // Admin vê todos, reseller vê apenas os seus
      const where = user.role === 'admin' ? {} : { userId: user.id };
      
      const clients = await prisma.client.findMany({
        where,
        include: { bots: true }
      });
      return clients;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar clientes' });
    }
  }
});

// Criar cliente
fastify.post('/api/clients', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { name, email, phone, company, metadata = {} } = request.body;
      
      if (!name) {
        return reply.status(400).send({ error: 'Nome é obrigatório' });
      }

      const client = await prisma.client.create({
        data: {
          userId: user.id,
          name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          metadata
        }
      });
      return reply.status(201).send(client);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar cliente' });
    }
  }
});

// Atualizar cliente
fastify.put('/api/clients/:id', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { id } = request.params;
      const { name, email, phone, company, isActive, metadata } = request.body;
      
      // Verificar se o cliente pertence ao usuário
      const existingClient = await prisma.client.findFirst({
        where: { 
          id,
          userId: user.role === 'admin' ? undefined : user.id
        }
      });
      
      if (!existingClient) {
        return reply.status(404).send({ error: 'Cliente não encontrado' });
      }

      const client = await prisma.client.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          company,
          isActive,
          metadata
        }
      });
      return client;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar cliente' });
    }
  }
});

// Deletar cliente
fastify.delete('/api/clients/:id', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { id } = request.params;
      
      // Verificar se o cliente pertence ao usuário
      const existingClient = await prisma.client.findFirst({
        where: { 
          id,
          userId: user.role === 'admin' ? undefined : user.id
        }
      });
      
      if (!existingClient) {
        return reply.status(404).send({ error: 'Cliente não encontrado' });
      }

      await prisma.client.delete({ where: { id } });
      return { message: 'Cliente removido com sucesso' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao remover cliente' });
    }
  }
});

// ==================== BOTS ROUTES ====================

// Listar bots
fastify.get('/api/bots', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      
      // Buscar clientes do usuário
      const clients = await prisma.client.findMany({
        where: { userId: user.role === 'admin' ? undefined : user.id },
        select: { id: true }
      });
      
      const clientIds = clients.map(c => c.id);
      
      const bots = await prisma.bot.findMany({
        where: { clientId: { in: clientIds } },
        include: { client: true, instances: true }
      });
      return bots;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar bots' });
    }
  }
});

// Criar bot
fastify.post('/api/bots', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { 
        clientId, 
        name, 
        botType = 'private', 
        personalityPrompt, 
        aiProvider = 'openai',
        aiModel,
        maxTokens = 1000,
        temperature = 0.7,
        welcomeMessage,
        settings = {}
      } = request.body;
      
      if (!clientId || !name || !personalityPrompt) {
        return reply.status(400).send({ error: 'clientId, name e personalityPrompt são obrigatórios' });
      }

      // Verificar se o cliente pertence ao usuário
      const client = await prisma.client.findFirst({
        where: { 
          id: clientId,
          userId: user.role === 'admin' ? undefined : user.id
        }
      });
      
      if (!client) {
        return reply.status(404).send({ error: 'Cliente não encontrado' });
      }

      const bot = await prisma.bot.create({
        data: {
          clientId,
          name,
          botType,
          personalityPrompt,
          aiProvider,
          aiModel: aiModel || null,
          maxTokens,
          temperature,
          welcomeMessage: welcomeMessage || null,
          settings
        }
      });
      return reply.status(201).send(bot);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar bot' });
    }
  }
});

// Atualizar bot
fastify.put('/api/bots/:id', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { id } = request.params;
      const data = request.body;
      
      const bot = await prisma.bot.findUnique({
        include: { client: true }
      });
      
      if (!bot) {
        return reply.status(404).send({ error: 'Bot não encontrado' });
      }

      // Verificar permissão
      const client = await prisma.client.findFirst({
        where: { 
          id: bot.clientId,
          userId: user.role === 'admin' ? undefined : user.id
        }
      });
      
      if (!client) {
        return reply.status(403).send({ error: 'Acesso não permitido' });
      }

      const updatedBot = await prisma.bot.update({
        where: { id },
        data
      });
      return updatedBot;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar bot' });
    }
  }
});

// Deletar bot
fastify.delete('/api/bots/:id', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { id } = request.params;
      
      const bot = await prisma.bot.findUnique({
        include: { client: true }
      });
      
      if (!bot) {
        return reply.status(404).send({ error: 'Bot não encontrado' });
      }

      // Verificar permissão
      const client = await prisma.client.findFirst({
        where: { 
          id: bot.clientId,
          userId: user.role === 'admin' ? undefined : user.id
        }
      });
      
      if (!client) {
        return reply.status(403).send({ error: 'Acesso não permitido' });
      }

      await prisma.bot.delete({ where: { id } });
      return { message: 'Bot removido com sucesso' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao remover bot' });
    }
  }
});

// ==================== INSTANCES ROUTES ====================

// Listar instâncias
fastify.get('/api/instances', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      
      const instances = await prisma.instance.findMany({
        include: { bot: { include: { client: true } } }
      });
      
      // Filtrar por permissão
      let filteredInstances = instances;
      if (user.role !== 'admin') {
        const clients = await prisma.client.findMany({
          where: { userId: user.id },
          select: { id: true }
        });
        const clientIds = clients.map(c => c.id);
        const bots = await prisma.bot.findMany({
          where: { clientId: { in: clientIds } },
          select: { id: true }
        });
        const botIds = bots.map(b => b.id);
        filteredInstances = instances.filter(i => !i.botId || botIds.includes(i.botId));
      }
      
      return filteredInstances;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar instâncias' });
    }
  }
});

// Criar instância
fastify.post('/api/instances', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { 
        botId, 
        instanceType, 
        instanceName, 
        phoneNumber, 
        tokenTelegram,
        webhookUrl 
      } = request.body;
      
      if (!instanceType || !instanceName) {
        return reply.status(400).send({ error: 'instanceType e instanceName são obrigatórios' });
      }

      // Se tiver botId, verificar permissão
      if (botId) {
        const bot = await prisma.bot.findUnique({
          include: { client: true }
        });
        
        if (!bot) {
          return reply.status(404).send({ error: 'Bot não encontrado' });
        }

        const client = await prisma.client.findFirst({
          where: { 
            id: bot.clientId,
            userId: user.role === 'admin' ? undefined : user.id
          }
        });
        
        if (!client) {
          return reply.status(403).send({ error: 'Acesso não permitido' });
        }
      }

      const instance = await prisma.instance.create({
        data: {
          botId: botId || null,
          instanceType,
          instanceName,
          phoneNumber: phoneNumber || null,
          tokenTelegram: tokenTelegram || null,
          status: 'disconnected',
          webhookUrl: webhookUrl || null
        }
      });
      return reply.status(201).send(instance);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar instância' });
    }
  }
});

// Atualizar status da instância
fastify.patch('/api/instances/:id/status', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const { id } = request.params;
      const { status, qrCode } = request.body;
      
      const instance = await prisma.instance.update({
        where: { id },
        data: { 
          status, 
          qrCode, 
          qrExpiresAt: qrCode ? new Date(Date.now() + 60000) : null,
          lastSeenAt: status === 'connected' ? new Date() : null
        }
      });
      
      return instance;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar status' });
    }
  }
});

// Desconectar instância
fastify.post('/api/instances/:id/disconnect', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const { id } = request.params;
      
      const instance = await prisma.instance.update({
        where: { id },
        data: { 
          status: 'disconnected',
          qrCode: null,
          sessionData: null
        }
      });
      
      return instance;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao desconectar' });
    }
  }
});

// ==================== API KEYS ROUTES ====================

// Listar API Keys do usuário
fastify.get('/api/api-keys', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      
      const keys = await prisma.apiKey.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          provider: true,
          label: true,
          isActive: true,
          usageCount: true,
          usageLimit: true,
          createdAt: true
        }
      });
      return keys;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar API Keys' });
    }
  }
});

// Criar API Key
fastify.post('/api/api-keys', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { provider, apiKey, label, usageLimit } = request.body;
      
      if (!provider || !apiKey) {
        return reply.status(400).send({ error: 'provider e apiKey são obrigatórios' });
      }

      const key = await prisma.apiKey.create({
        data: {
          userId: user.id,
          provider,
          apiKey,
          label: label || null,
          usageLimit: usageLimit || null
        }
      });
      return reply.status(201).send(key);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar API Key' });
    }
  }
});

// Deletar API Key
fastify.delete('/api/api-keys/:id', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { id } = request.params;
      
      const key = await prisma.apiKey.findFirst({
        where: { id, userId: user.id }
      });
      
      if (!key) {
        return reply.status(404).send({ error: 'API Key não encontrada' });
      }

      await prisma.apiKey.delete({ where: { id } });
      return { message: 'API Key removida com sucesso' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao remover API Key' });
    }
  }
});

// ==================== STATS ROUTES ====================

// Estatísticas gerais
fastify.get('/api/stats', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      
      let whereClause = {};
      
      // Se não for admin, filtrar pelos seus dados
      if (user.role !== 'admin') {
        const clients = await prisma.client.findMany({
          where: { userId: user.id },
          select: { id: true }
        });
        const clientIds = clients.map(c => c.id);
        
        const bots = await prisma.bot.findMany({
          where: { clientId: { in: clientIds } },
          select: { id: true }
        });
        const botIds = bots.map(b => b.id);
        
        const instances = await prisma.instance.findMany({
          where: { botId: { in: botIds } },
          select: { id: true }
        });
        const instanceIds = instances.map(i => i.id);
        
        whereClause = { id: { in: instanceIds } };
      }

      const [usersCount, clientsCount, botsCount, instancesCount] = await Promise.all([
        user.role === 'admin' 
          ? prisma.user.count()
          : prisma.user.count({ where: { parentId: user.id } }),
        user.role === 'admin'
          ? prisma.client.count()
          : prisma.client.count({ where: { userId: user.id } }),
        user.role === 'admin'
          ? prisma.bot.count()
          : prisma.bot.count({
              include: { client: true },
              where: { client: { userId: user.id } }
            }),
        user.role === 'admin'
          ? prisma.instance.count()
          : prisma.instance.count(whereClause)
      ]);

      const connectedInstances = user.role === 'admin'
        ? await prisma.instance.count({ where: { status: 'connected' } })
        : await prisma.instance.count({ 
            where: { ...whereClause, status: 'connected' } 
          });

      return {
        users: usersCount,
        clients: clientsCount,
        bots: botsCount,
        instances: instancesCount,
        connectedInstances
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar estatísticas' });
    }
  }
});

// ==================== RESELLER ROUTES ====================

// Criar revendedor (apenas admin ou reseller pode criar subordinados)
fastify.post('/api/resellers', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      const { name, email, password } = request.body;
      
      if (!name || !email || !password) {
        return reply.status(400).send({ error: 'Nome, email e senha são obrigatórios' });
      }

      // Apenas admin pode criar outros admins
      const role = request.body.role === 'admin' && user.role === 'admin' ? 'admin' : 'reseller';

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.status(409).send({ error: 'Email já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const reseller = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          parentId: user.role === 'admin' ? null : user.id
        }
      });

      return reply.status(201).send({ 
        id: reseller.id, 
        name: reseller.name, 
        email: reseller.email, 
        role: reseller.role 
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar revendedor' });
    }
  }
});

// Listar revendedores subordinados
fastify.get('/api/resellers', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    try {
      const user = request.user;
      
      const resellers = await prisma.user.findMany({
        where: { 
          parentId: user.role === 'admin' ? null : user.id,
          role: 'reseller'
        },
        include: {
          _count: {
            select: { children: true, clients: true }
          }
        }
      });
      
      return resellers;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar revendedores' });
    }
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    console.log(`🚀 K-Bot API running on port ${process.env.PORT || 3000}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
});

start();
