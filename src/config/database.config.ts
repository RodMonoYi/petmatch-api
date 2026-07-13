import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions, EntitySchema } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Pet } from '../entities/pet.entity';
import { Match } from '../entities/match.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Swipe } from '../entities/swipe.entity';
import { Notification } from '../entities/notification.entity';
import { SavedPet } from '../entities/saved-pet.entity';
import { AdCompetitionGroup } from '../entities/ad-competition-group.entity';
import { AdPlacement } from '../entities/ad-placement.entity';
import { Ad } from '../entities/ad.entity';
import { AdDelivery } from '../entities/ad-delivery.entity';
import { PetDictionaryEntry } from '../entities/pet-dictionary-entry.entity';
import { CreateInitialPostgresSchema1783070000000 } from '../migrations/1783070000000-CreateInitialPostgresSchema';
import { AddPetActiveFlag1783071000000 } from '../migrations/1783071000000-AddPetActiveFlag';
import { AddUserRolesAndAds1783600000000 } from '../migrations/1783600000000-AddUserRolesAndAds';
import { RestructureAdsPlacementsAndCompetitionGroups1783601000000 } from '../migrations/1783601000000-RestructureAdsPlacementsAndCompetitionGroups';
import { AddAdCreativeDisplayFields1783602000000 } from '../migrations/1783602000000-AddAdCreativeDisplayFields';
import { AddPetDictionaryEntries1783603000000 } from '../migrations/1783603000000-AddPetDictionaryEntries';
import { AddBreedSpeciesToPetDictionary1783604000000 } from '../migrations/1783604000000-AddBreedSpeciesToPetDictionary';

type EntityList = Array<Function | string | EntitySchema>;

type ConfigReader = {
  get(key: string): string | undefined;
};

export const databaseEntities: EntityList = [
  User,
  Pet,
  Match,
  Conversation,
  Message,
  Swipe,
  Notification,
  SavedPet,
  AdPlacement,
  AdCompetitionGroup,
  Ad,
  AdDelivery,
  PetDictionaryEntry,
];

const postgresMigrations = [
  CreateInitialPostgresSchema1783070000000,
  AddPetActiveFlag1783071000000,
  AddUserRolesAndAds1783600000000,
  RestructureAdsPlacementsAndCompetitionGroups1783601000000,
  AddAdCreativeDisplayFields1783602000000,
  AddPetDictionaryEntries1783603000000,
  AddBreedSpeciesToPetDictionary1783604000000,
];

const getBoolean = (
  value: string | boolean | undefined,
  defaultValue: boolean,
): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === '') return defaultValue;

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const getNumber = (
  value: string | number | undefined,
  defaultValue: number,
): number => {
  if (typeof value === 'number') return value;
  if (!value) return defaultValue;

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
};

const getSynchronizeDefault = (config: ConfigReader): boolean =>
  config.get('NODE_ENV') !== 'production';

const getSslOptions = (config: ConfigReader) => {
  const sslEnabled = getBoolean(config.get('DATABASE_SSL'), false);
  if (!sslEnabled) return false;

  return {
    rejectUnauthorized: getBoolean(
      config.get('DATABASE_SSL_REJECT_UNAUTHORIZED'),
      true,
    ),
  };
};

const buildDatabaseOptions = (
  config: ConfigReader,
  options: { autoLoadEntities?: boolean; entities?: EntityList } = {},
): TypeOrmModuleOptions | DataSourceOptions => {
  const synchronize = getBoolean(
    config.get('DATABASE_SYNCHRONIZE'),
    getSynchronizeDefault(config),
  );
  const logging = getBoolean(config.get('DATABASE_LOGGING'), false);
  const migrationsRun = getBoolean(config.get('DATABASE_MIGRATIONS_RUN'), false);
  const url = config.get('DATABASE_URL');

  return {
    type: 'postgres',
    ...(url
      ? { url }
      : {
          host: config.get('DATABASE_HOST') || 'localhost',
          port: getNumber(config.get('DATABASE_PORT'), 5432),
          username:
            config.get('DATABASE_USERNAME') ||
            config.get('POSTGRES_USER') ||
            'postgres',
          password:
            config.get('DATABASE_PASSWORD') ||
            config.get('POSTGRES_PASSWORD') ||
            'password',
          database:
            config.get('DATABASE_NAME') ||
            config.get('POSTGRES_DB') ||
            'petmatch',
        }),
    ssl: getSslOptions(config),
    uuidExtension: 'pgcrypto',
    synchronize,
    migrationsRun,
    migrations: postgresMigrations,
    logging,
    autoLoadEntities: options.autoLoadEntities,
    entities: options.entities,
  };
};

export const createTypeOrmOptions = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const configReader: ConfigReader = {
    get: (key) => configService.get<string>(key),
  };

  return buildDatabaseOptions(configReader, {
    autoLoadEntities: true,
  }) as TypeOrmModuleOptions;
};

export const createDataSourceOptionsFromEnv = (): DataSourceOptions => {
  const envConfig: ConfigReader = {
    get: (key) => process.env[key],
  };

  return buildDatabaseOptions(envConfig, {
    entities: databaseEntities,
  }) as DataSourceOptions;
};
