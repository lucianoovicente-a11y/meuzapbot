import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

const prisma = new PrismaClient();

fastify.register(cors, {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
});

fastify.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000
});

fastify.register(websocket);

fastify.decorate('prisma', prisma);

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0'
}));

fastify.post('/api/auth/register', async (request, reply) => {
  const { name, email, password } = request.body;
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'reseller'
    }
  });

  const token = fastify.jwt.sign({ id: user.id, email: user.email });

  return reply.status(201).send({ user, token });
});

fastify.post('/api/auth/login', async (request, reply) => {
  const { email, password } = request.body;
  
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return reply.status(401).send({ error: 'Credenciais inválidas' });
  }

  const token = fastify.jwt.sign({ id: user.id, email: user.email });

  return { user, token };
});

fastify.get('/api/users', async (request, reply) => {
  const users = await prisma.user.findMany({
    include: { subscriptions: true }
  });
  return users;
});

fastify.get('/api/clients', async (request, reply) => {
  const clients = await prisma.client.findMany({
    include: { bots: true }
  });
  return clients;
});

fastify.post('/api/clients', async (request, reply) => {
  const client = await prisma.client.create({
    data: request.body
  });
  return reply.status(201).send(client);
});

fastify.get('/api/bots', async (request, reply) => {
  const bots = await prisma.bot.findMany({
    include: { client: true, instances: true }
  });
  return bots;
});

fastify.post('/api/bots', async (request, reply) => {
  const bot = await prisma.bot.create({
    data: request.body
  });
  return reply.status(201).send(bot);
});

fastify.get('/api/instances', async (request, reply) => {
  const instances = await prisma.instance.findMany({
    include: { bot: true }
  });
  return instances;
});

fastify.post('/api/instances', async (request, reply) => {
  const instance = await prisma.instance.create({
    data: request.body
  });
  return reply.status(201).send(instance);
});

fastify.patch('/api/instances/:id/status', async (request, reply) => {
  const { id } = request.params;
  const { status, qrCode } = request.body;
  
  const instance = await prisma.instance.update({
    where: { id },
    data: { status, qrCode, qrExpiresAt: qrCode ? new Date() : null }
  });
  
  return instance;
});

fastify.get('/api/api-keys', async (request, reply) => {
  const keys = await prisma.apiKey.findMany();
  return keys;
});

fastify.post('/api/api-keys', async (request, reply) => {
  const key = await prisma.apiKey.create({
    data: request.body
  });
  return reply.status(201).send(key);
});

fastify.get('/api/stats', async (request, reply) => {
  const [users, clients, bots, instances] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.bot.count(),
    prisma.instance.count()
  ]);

  const connectedInstances = await prisma.instance.count({
    where: { status: 'connected' }
  });

  return {
    users,
    clients,
    bots,
    instances,
    connectedInstances
  };
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
