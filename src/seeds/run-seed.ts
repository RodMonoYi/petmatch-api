import 'dotenv/config';
import { DataSource } from 'typeorm';
import { seedDatabase } from './seed';
import { createDataSourceOptionsFromEnv } from '../config/database.config';

const AppDataSource = new DataSource(createDataSourceOptionsFromEnv());

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
