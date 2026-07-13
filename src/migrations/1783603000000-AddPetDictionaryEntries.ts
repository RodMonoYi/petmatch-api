import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_PET_DICTIONARY_ENTRIES } from '../pet-dictionary/pet-dictionary.defaults';

export class AddPetDictionaryEntries1783603000000
  implements MigrationInterface
{
  name = 'AddPetDictionaryEntries1783603000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pet_dictionary_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "category" character varying(20) NOT NULL,
        "canonical_key" character varying(120) NOT NULL,
        "label" character varying(120) NOT NULL,
        "aliases" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "active" boolean NOT NULL DEFAULT true,
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "atualizado_em" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_pet_dictionary_category_key" UNIQUE ("category", "canonical_key")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pet_dictionary_category"
      ON "pet_dictionary_entries" ("category")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pet_dictionary_active"
      ON "pet_dictionary_entries" ("active")
    `);

    await queryRunner.query(`
      ALTER TABLE "pets"
      ADD COLUMN IF NOT EXISTS "especie_normalizada" character varying(120)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pets_especie_normalizada"
      ON "pets" ("especie_normalizada")
    `);

    for (const entry of DEFAULT_PET_DICTIONARY_ENTRIES) {
      await queryRunner.query(
        `
          INSERT INTO "pet_dictionary_entries"
            ("category", "canonical_key", "label", "aliases", "active")
          VALUES ($1, $2, $3, $4::jsonb, true)
          ON CONFLICT ("category", "canonical_key") DO NOTHING
        `,
        [
          entry.category,
          entry.canonicalKey,
          entry.label,
          JSON.stringify(entry.aliases),
        ],
      );
    }

    await queryRunner.query(`
      UPDATE "pets"
      SET "especie_normalizada" = CASE
        WHEN lower("especie") IN ('cão', 'cao', 'cachorro') THEN 'cao'
        WHEN lower("especie") IN ('gato') THEN 'gato'
        WHEN lower("especie") IN ('pássaro', 'passaro', 'ave') THEN 'passaro'
        WHEN lower("especie") IN ('coelho') THEN 'coelho'
        WHEN lower("especie") IN ('outro') THEN 'outro'
        ELSE lower(regexp_replace("especie", '[^[:alnum:]]+', ' ', 'g'))
      END
      WHERE "especie_normalizada" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_pets_especie_normalizada"
    `);
    await queryRunner.query(`
      ALTER TABLE "pets"
      DROP COLUMN IF EXISTS "especie_normalizada"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_pet_dictionary_active"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_pet_dictionary_category"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "pet_dictionary_entries"
    `);
  }
}
