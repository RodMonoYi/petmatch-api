import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestructureAdsPlacementsAndCompetitionGroups1783601000000
  implements MigrationInterface
{
  name = 'RestructureAdsPlacementsAndCompetitionGroups1783601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ad_placements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" character varying(120) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" text NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "atualizado_em" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ad_placements_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ad_placements_code"
      ON "ad_placements" ("code")
    `);

    await queryRunner.query(`
      INSERT INTO "ad_placements" ("code", "name", "description", "sort_order")
      VALUES
        ('global_sponsor_slot', 'Slot global padrão', 'Slot genérico para uso legado do componente de patrocinado.', 0),
        ('home_banner', 'Banner da home', 'Faixa patrocinada exibida na página inicial.', 1),
        ('search_intro', 'Busca: introdução', 'Slot patrocinado exibido antes do formulário principal de busca.', 2),
        ('search_results', 'Busca: resultados', 'Slot patrocinado exibido antes da grade de resultados de busca.', 3),
        ('pet_details_sidebar', 'Detalhes do pet', 'Slot compacto exibido na lateral ou bloco de detalhes do pet.', 4),
        ('my_pets_sidebar', 'Meus pets', 'Slot compacto exibido na página de gestão dos pets do usuário.', 5),
        ('matches_sidebar', 'Matches', 'Slot compacto exibido na página de matches.', 6)
      ON CONFLICT ("code") DO UPDATE
      SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "sort_order" = EXCLUDED."sort_order"
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ad_competition_groups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" character varying(120) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" text,
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "atualizado_em" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ad_competition_groups_code" UNIQUE ("code"),
        CONSTRAINT "UQ_ad_competition_groups_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ad_competition_groups_code"
      ON "ad_competition_groups" ("code")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ad_competition_groups_name"
      ON "ad_competition_groups" ("name")
    `);

    await queryRunner.query(`
      ALTER TABLE "anuncios"
      ADD COLUMN IF NOT EXISTS "competition_group_id" uuid
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "anuncios_placements" (
        "ad_id" uuid NOT NULL,
        "placement_id" uuid NOT NULL,
        CONSTRAINT "PK_anuncios_placements" PRIMARY KEY ("ad_id", "placement_id"),
        CONSTRAINT "FK_anuncios_placements_ad" FOREIGN KEY ("ad_id") REFERENCES "anuncios" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_anuncios_placements_placement" FOREIGN KEY ("placement_id") REFERENCES "ad_placements" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_anuncios_placements_ad_id"
      ON "anuncios_placements" ("ad_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_anuncios_placements_placement_id"
      ON "anuncios_placements" ("placement_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'anuncios'
            AND column_name = 'placement'
        ) THEN
          INSERT INTO "ad_placements" ("code", "name", "description", "sort_order")
          SELECT DISTINCT
            a."placement",
            INITCAP(REPLACE(a."placement", '_', ' ')),
            'Slot migrado do modelo anterior.',
            999
          FROM "anuncios" a
          WHERE a."placement" IS NOT NULL
            AND BTRIM(a."placement") <> ''
            AND NOT EXISTS (
              SELECT 1
              FROM "ad_placements" p
              WHERE p."code" = a."placement"
            );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'anuncios'
            AND column_name = 'placement'
        ) THEN
          INSERT INTO "anuncios_placements" ("ad_id", "placement_id")
          SELECT a."id", p."id"
          FROM "anuncios" a
          INNER JOIN "ad_placements" p
            ON p."code" = a."placement"
          WHERE a."placement" IS NOT NULL
            AND BTRIM(a."placement") <> ''
          ON CONFLICT DO NOTHING;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'anuncios'
            AND column_name = 'competition_group'
        ) THEN
          WITH legacy_groups AS (
            SELECT
              BTRIM(a."competition_group") AS "name",
              'legacy-group-' || ROW_NUMBER() OVER (ORDER BY BTRIM(a."competition_group")) AS "code"
            FROM (
              SELECT DISTINCT "competition_group"
              FROM "anuncios"
              WHERE "competition_group" IS NOT NULL
                AND BTRIM("competition_group") <> ''
            ) a
          )
          INSERT INTO "ad_competition_groups" ("code", "name", "description")
          SELECT
            lg."code",
            lg."name",
            'Grupo migrado do modelo anterior.'
          FROM legacy_groups lg
          ON CONFLICT ("name") DO NOTHING;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'anuncios'
            AND column_name = 'competition_group'
        ) THEN
          UPDATE "anuncios" a
          SET "competition_group_id" = g."id"
          FROM "ad_competition_groups" g
          WHERE BTRIM(a."competition_group") = g."name"
            AND a."competition_group" IS NOT NULL
            AND BTRIM(a."competition_group") <> '';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_anuncios_competition_group_id'
        ) THEN
          ALTER TABLE "anuncios"
          ADD CONSTRAINT "FK_anuncios_competition_group_id"
          FOREIGN KEY ("competition_group_id") REFERENCES "ad_competition_groups" ("id")
          ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_anuncios_status"
      ON "anuncios" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_anuncios_competition_group_id"
      ON "anuncios" ("competition_group_id")
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_anuncios_placement_status"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_anuncios_competition_group"',
    );
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      DROP COLUMN IF EXISTS "placement"
    `);
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      DROP COLUMN IF EXISTS "competition_group"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      ADD COLUMN "placement" character varying(120)
    `);
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      ADD COLUMN "competition_group" character varying(80)
    `);

    await queryRunner.query(`
      UPDATE "anuncios" a
      SET "placement" = placement_data."code"
      FROM (
        SELECT ap."ad_id", MIN(p."code") AS "code"
        FROM "anuncios_placements" ap
        INNER JOIN "ad_placements" p
          ON p."id" = ap."placement_id"
        GROUP BY ap."ad_id"
      ) placement_data
      WHERE placement_data."ad_id" = a."id"
    `);

    await queryRunner.query(`
      UPDATE "anuncios" a
      SET "competition_group" = g."name"
      FROM "ad_competition_groups" g
      WHERE g."id" = a."competition_group_id"
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_anuncios_competition_group_id"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_anuncios_status"');
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      DROP CONSTRAINT IF EXISTS "FK_anuncios_competition_group_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "anuncios"
      DROP COLUMN IF EXISTS "competition_group_id"
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_anuncios_placements_placement_id"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_anuncios_placements_ad_id"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "anuncios_placements"');

    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_ad_competition_groups_name"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_ad_competition_groups_code"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "ad_competition_groups"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_ad_placements_code"');
    await queryRunner.query('DROP TABLE IF EXISTS "ad_placements"');

    await queryRunner.query(`
      CREATE INDEX "IDX_anuncios_placement_status"
      ON "anuncios" ("placement", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_anuncios_competition_group"
      ON "anuncios" ("competition_group")
    `);
  }
}
