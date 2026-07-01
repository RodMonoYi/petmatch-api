import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Pet } from '../entities/pet.entity';
import { Match } from '../entities/match.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Swipe } from '../entities/swipe.entity';
import { Notification } from '../entities/notification.entity';
import { seedDatabase } from './seed';

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DATABASE_PATH || 'database.sqlite',
  synchronize: true,
  logging: false,
  entities: [User, Pet, Match, Conversation, Message, Swipe, Notification],
});

async function runSeed() {
  try {
    console.log('🔄 Inicializando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('✅ Conexão estabelecida!');

    await seedDatabase(AppDataSource);

    console.log('🎯 Seed executado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔚 Conexão fechada.');
  }
}

void runSeed();
