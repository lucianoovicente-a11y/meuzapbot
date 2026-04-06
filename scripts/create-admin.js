import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'admin@kbot.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingAdmin = await prisma.user.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      console.log('Admin já existe, atualizando senha...');
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
      });
      console.log('Senha do admin atualizada!');
    } else {
      await prisma.user.create({
        data: {
          name: 'Administrator',
          email,
          password: hashedPassword,
          role: 'admin'
        }
      });
      console.log('Admin criado com sucesso!');
    }

    console.log('\nCredenciais de acesso:');
    console.log('Email: admin@kbot.com');
    console.log('Senha: admin123');
    console.log('\n⚠️  LEMBRE-SE: Altere a senha após o primeiro login!');

  } catch (error) {
    console.error('Erro ao criar admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
