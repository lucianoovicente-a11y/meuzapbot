import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.API_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const whatsappSessions = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'bot-engine', timestamp: new Date().toISOString() });
});

app.post('/api/whatsapp/connect', async (req, res) => {
  try {
    const { instanceName, botId } = req.body;
    
    const instance = await prisma.instance.findUnique({
      where: { instanceName }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    await prisma.instance.update({
      where: { instanceName },
      data: { status: 'connecting' }
    });

    io.emit('qrcode', {
      instanceName,
      qr: 'QR_CODE_WILL_BE_GENERATED_HERE'
    });

    res.json({ 
      success: true, 
      message: 'Conectando ao WhatsApp',
      instanceName 
    });
  } catch (error) {
    console.error('Erro ao conectar:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    const { instanceName } = req.body;
    
    whatsappSessions.delete(instanceName);
    
    await prisma.instance.update({
      where: { instanceName },
      data: { status: 'disconnected' }
    });

    res.json({ success: true, message: 'Desconectado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/whatsapp/status/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    
    const instance = await prisma.instance.findUnique({
      where: { instanceName }
    });

    res.json({
      instanceName,
      status: instance?.status || 'disconnected',
      phoneNumber: instance?.phoneNumber
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join-instance', (instanceName) => {
    socket.join(instanceName);
    console.log(`Socket ${socket.id} entrou na instância ${instanceName}`);
  });

  socket.on('leave-instance', (instanceName) => {
    socket.leave(instanceName);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 K-Bot Engine running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('Desligando bot engine...');
  await prisma.$disconnect();
  process.exit(0);
});
