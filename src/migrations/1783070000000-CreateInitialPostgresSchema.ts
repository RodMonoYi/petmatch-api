import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialPostgresSchema1783070000000
  implements MigrationInterface
{
  name = 'CreateInitialPostgresSchema1783070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nome" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "senha_hash" character varying(255) NOT NULL,
        "telefone" character varying(20),
        "foto_perfil_url" text,
        "localizacao_geo" text,
        "raio_maximo" integer DEFAULT 20,
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "atualizado_em" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_usuarios_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nome" character varying(100) NOT NULL,
        "especie" character varying(50) NOT NULL,
        "raca" character varying(100) NOT NULL,
        "raca_normalizada" character varying(120),
        "data_nascimento" date NOT NULL,
        "genero" character varying(10) NOT NULL,
        "porte" character varying(20) NOT NULL,
        "descricao" text,
        "fotos" text,
        "pedigree" boolean NOT NULL DEFAULT false,
        "dados_saude" text,
        "verificado_clinica" boolean NOT NULL DEFAULT false,
        "disponivel_reproducao" boolean NOT NULL DEFAULT true,
        "aceita_viagem" boolean NOT NULL DEFAULT false,
        "fk_clinica_verificadora_id" text,
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "atualizado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "fk_usuario_id" uuid NOT NULL,
        CONSTRAINT "FK_pets_usuario" FOREIGN KEY ("fk_usuario_id") REFERENCES "usuarios"("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_pets_raca_normalizada" ON "pets" ("raca_normalizada")',
    );

    await queryRunner.query(`
      CREATE TABLE "swipes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "action" character varying(10) NOT NULL,
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "fk_pet_id_1" uuid NOT NULL,
        "fk_pet_id_2" uuid NOT NULL,
        CONSTRAINT "UQ_swipes_pet_pair" UNIQUE ("fk_pet_id_1", "fk_pet_id_2"),
        CONSTRAINT "FK_swipes_pet_1" FOREIGN KEY ("fk_pet_id_1") REFERENCES "pets"("id"),
        CONSTRAINT "FK_swipes_pet_2" FOREIGN KEY ("fk_pet_id_2") REFERENCES "pets"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "status" character varying(20) NOT NULL DEFAULT 'pendente',
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "fk_pet_id_1" uuid NOT NULL,
        "fk_pet_id_2" uuid NOT NULL,
        CONSTRAINT "FK_matches_pet_1" FOREIGN KEY ("fk_pet_id_1") REFERENCES "pets"("id"),
        CONSTRAINT "FK_matches_pet_2" FOREIGN KEY ("fk_pet_id_2") REFERENCES "pets"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conversas" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "fk_match_id" uuid NOT NULL,
        "fk_participante_1_id" uuid NOT NULL,
        "fk_participante_2_id" uuid NOT NULL,
        CONSTRAINT "UQ_conversas_match" UNIQUE ("fk_match_id"),
        CONSTRAINT "FK_conversas_match" FOREIGN KEY ("fk_match_id") REFERENCES "matches"("id"),
        CONSTRAINT "FK_conversas_participante_1" FOREIGN KEY ("fk_participante_1_id") REFERENCES "usuarios"("id"),
        CONSTRAINT "FK_conversas_participante_2" FOREIGN KEY ("fk_participante_2_id") REFERENCES "usuarios"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mensagens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "conteudo" text NOT NULL,
        "enviada_em" timestamp with time zone NOT NULL DEFAULT now(),
        "fk_conversa_id" uuid NOT NULL,
        "fk_remetente_id" uuid NOT NULL,
        CONSTRAINT "FK_mensagens_conversa" FOREIGN KEY ("fk_conversa_id") REFERENCES "conversas"("id"),
        CONSTRAINT "FK_mensagens_remetente" FOREIGN KEY ("fk_remetente_id") REFERENCES "usuarios"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notificacoes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tipo" character varying(30) NOT NULL,
        "titulo" character varying(120) NOT NULL,
        "mensagem" text NOT NULL,
        "lida" boolean NOT NULL DEFAULT false,
        "dados" text,
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "lida_em" timestamp with time zone,
        "fk_usuario_id" uuid NOT NULL,
        CONSTRAINT "FK_notificacoes_usuario" FOREIGN KEY ("fk_usuario_id") REFERENCES "usuarios"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pets_salvos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
        "fk_usuario_id" uuid NOT NULL,
        "fk_pet_id" uuid NOT NULL,
        CONSTRAINT "UQ_pets_salvos_usuario_pet" UNIQUE ("fk_usuario_id", "fk_pet_id"),
        CONSTRAINT "FK_pets_salvos_usuario" FOREIGN KEY ("fk_usuario_id") REFERENCES "usuarios"("id"),
        CONSTRAINT "FK_pets_salvos_pet" FOREIGN KEY ("fk_pet_id") REFERENCES "pets"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "pets_salvos"');
    await queryRunner.query('DROP TABLE IF EXISTS "notificacoes"');
    await queryRunner.query('DROP TABLE IF EXISTS "mensagens"');
    await queryRunner.query('DROP TABLE IF EXISTS "conversas"');
    await queryRunner.query('DROP TABLE IF EXISTS "matches"');
    await queryRunner.query('DROP TABLE IF EXISTS "swipes"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_pets_raca_normalizada"');
    await queryRunner.query('DROP TABLE IF EXISTS "pets"');
    await queryRunner.query('DROP TABLE IF EXISTS "usuarios"');
  }
}
