import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRolesAndAds1783600000000 implements MigrationInterface {
  name = 'AddUserRolesAndAds1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN "role" character varying(20) NOT NULL DEFAULT 'user'
    `);

    await queryRunner.query(`
      CREATE TABLE "anuncios" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" character varying(20) NOT NULL,
        "title" character varying(160) NOT NULL,
        "content" text,
        "image_url" text,
        "target_url" text,
        "placement" character varying(120) NOT NULL,
        "starts_at" timestamp with time zone NOT NULL,
        "ends_at" timestamp with time zone NOT NULL,
        "priority" integer NOT NULL DEFAULT 1,
        "status" character varying(20) NOT NULL DEFAULT 'inactive',
        "competition_group" character varying(80),
        "impressions_limit" integer,
        "clicks_limit" integer,
        "impressions_count" integer NOT NULL DEFAULT 0,
        "clicks_count" integer NOT NULL DEFAULT 0,
        "created_by" uuid NOT NULL,
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "atualizado_em" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_anuncios_created_by" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_anuncios_placement_status"
      ON "anuncios" ("placement", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_anuncios_periodo"
      ON "anuncios" ("starts_at", "ends_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_anuncios_competition_group"
      ON "anuncios" ("competition_group")
    `);

    await queryRunner.query(`
      CREATE TABLE "anuncio_entregas" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ad_id" uuid NOT NULL,
        "placement" character varying(120) NOT NULL,
        "impression_tracked_at" timestamp with time zone,
        "click_tracked_at" timestamp with time zone,
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_anuncio_entregas_ad" FOREIGN KEY ("ad_id") REFERENCES "anuncios"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_anuncio_entregas_anuncio"
      ON "anuncio_entregas" ("ad_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_anuncio_entregas_anuncio"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "anuncio_entregas"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_anuncios_competition_group"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_anuncios_periodo"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_anuncios_placement_status"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "anuncios"');
    await queryRunner.query('ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "role"');
  }
}
