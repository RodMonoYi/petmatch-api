import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPetActiveFlag1783071000000 implements MigrationInterface {
  name = 'AddPetActiveFlag1783071000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "ativo" boolean NOT NULL DEFAULT true',
    );
    await queryRunner.query('UPDATE "pets" SET "ativo" = true WHERE "ativo" IS NULL');
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_pets_ativo" ON "pets" ("ativo")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_pets_ativo"');
    await queryRunner.query('ALTER TABLE "pets" DROP COLUMN IF EXISTS "ativo"');
  }
}
