import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_BREED_ALIAS_GROUPS } from '../common/pets/breed-normalization.util';
import { DEFAULT_BREED_SPECIES_BY_KEY } from '../pet-dictionary/pet-dictionary.defaults';

export class AddBreedSpeciesToPetDictionary1783604000000
  implements MigrationInterface
{
  name = 'AddBreedSpeciesToPetDictionary1783604000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pet_dictionary_entries"
      ADD COLUMN IF NOT EXISTS "species_canonical_key" character varying(120)
    `);

    await queryRunner.query(`
      ALTER TABLE "pet_dictionary_entries"
      DROP CONSTRAINT IF EXISTS "UQ_pet_dictionary_category_key"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_pet_dictionary_species_key"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_pet_dictionary_breed_species_key"
    `);

    for (const [breedKey, speciesKey] of Object.entries(
      DEFAULT_BREED_SPECIES_BY_KEY,
    )) {
      await queryRunner.query(
        `
          UPDATE "pet_dictionary_entries"
          SET "species_canonical_key" = $1
          WHERE "category" = 'breed'
            AND "canonical_key" = $2
            AND "species_canonical_key" IS NULL
        `,
        [speciesKey, breedKey],
      );
    }

    await queryRunner.query(`
      UPDATE "pet_dictionary_entries"
      SET "species_canonical_key" = 'outro'
      WHERE "category" = 'breed'
        AND "species_canonical_key" IS NULL
    `);

    await queryRunner.query(
      `
        INSERT INTO "pet_dictionary_entries"
          ("category", "species_canonical_key", "canonical_key", "label", "aliases", "active")
        SELECT 'breed', 'gato', 'srd', 'SRD', $1::jsonb, true
        WHERE NOT EXISTS (
          SELECT 1
          FROM "pet_dictionary_entries"
          WHERE "category" = 'breed'
            AND "species_canonical_key" = 'gato'
            AND "canonical_key" = 'srd'
        )
      `,
      [JSON.stringify(DEFAULT_BREED_ALIAS_GROUPS.srd || ['SRD'])],
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pet_dictionary_species_key"
      ON "pet_dictionary_entries" ("category", "canonical_key")
      WHERE "category" = 'species'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pet_dictionary_breed_species_key"
      ON "pet_dictionary_entries" ("category", "species_canonical_key", "canonical_key")
      WHERE "category" = 'breed'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pet_dictionary_category_species"
      ON "pet_dictionary_entries" ("category", "species_canonical_key")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pet_dictionary_species_key"
      ON "pet_dictionary_entries" ("species_canonical_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_pet_dictionary_species_key"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_pet_dictionary_category_species"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_pet_dictionary_breed_species_key"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_pet_dictionary_species_key"
    `);

    await queryRunner.query(`
      DELETE FROM "pet_dictionary_entries"
      WHERE "category" = 'breed'
        AND "canonical_key" = 'srd'
        AND "species_canonical_key" = 'gato'
    `);

    await queryRunner.query(`
      ALTER TABLE "pet_dictionary_entries"
      DROP COLUMN IF EXISTS "species_canonical_key"
    `);

    await queryRunner.query(`
      ALTER TABLE "pet_dictionary_entries"
      ADD CONSTRAINT "UQ_pet_dictionary_category_key"
      UNIQUE ("category", "canonical_key")
    `);
  }
}
