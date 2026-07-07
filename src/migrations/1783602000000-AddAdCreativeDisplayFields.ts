import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdCreativeDisplayFields1783602000000
  implements MigrationInterface
{
  name = 'AddAdCreativeDisplayFields1783602000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      ADD COLUMN IF NOT EXISTS "image_mobile_url" text
    `);
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      ADD COLUMN IF NOT EXISTS "image_alt_text" character varying(160)
    `);
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      ADD COLUMN IF NOT EXISTS "display_mode" character varying(30) NOT NULL DEFAULT 'native'
    `);
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      ADD COLUMN IF NOT EXISTS "creative_size" character varying(40) NOT NULL DEFAULT 'auto'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      DROP COLUMN IF EXISTS "creative_size"
    `);
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      DROP COLUMN IF EXISTS "display_mode"
    `);
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      DROP COLUMN IF EXISTS "image_alt_text"
    `);
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      DROP COLUMN IF EXISTS "image_mobile_url"
    `);
  }
}
