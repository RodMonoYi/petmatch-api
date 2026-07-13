# Deploy e Backup do PetMatch

Estes scripts foram feitos para rodar na VM onde o backend do PetMatch sobe com Docker Compose.

O frontend fica na Vercel e nao e atualizado por estes scripts.

## Estrutura esperada

```text
~/petmatch/petmatch-api/
  deploy/
    deploy.sh
    backup.sh
    README.md
  docker-compose.yml
  .env
```

Se o caminho do repo na VM for diferente, use as variaveis mostradas abaixo.

## Deploy manual

Na VM:

```bash
cd ~/petmatch/petmatch-api
./deploy/deploy.sh
```

O script faz:

- atualiza o repo do backend com `git fetch` e `git pull --ff-only`;
- faz backup antes do deploy;
- valida o Docker Compose;
- executa `docker compose up -d --build --remove-orphans`;
- verifica se a API responde dentro do container;
- mostra o status dos containers.

## Variaveis uteis do deploy

```bash
DEPLOY_BRANCH=main ./deploy/deploy.sh
RUN_BACKUP_BEFORE_DEPLOY=false ./deploy/deploy.sh
PRUNE_DANGLING_IMAGES=true ./deploy/deploy.sh
```

Se os caminhos forem diferentes na VM:

```bash
API_DIR=/home/ubuntu/petmatch/petmatch-api \
ENV_FILE=/home/ubuntu/petmatch/petmatch-api/.env \
COMPOSE_FILE=/home/ubuntu/petmatch/petmatch-api/docker-compose.yml \
./deploy/deploy.sh
```

## Backup manual

```bash
cd ~/petmatch/petmatch-api
./deploy/backup.sh
```

O backup salva em `~/backups/petmatch`:

- banco PostgreSQL em `.dump`;
- uploads da API em `.tar.gz`;
- manifesto com commit do backend e checksums.

## Backup automatico as 02:00

Na VM:

```bash
cd ~/petmatch/petmatch-api
./deploy/backup.sh --install-cron
crontab -l
```

O cron instalado roda todos os dias as 02:00 e grava logs em:

```text
~/backups/petmatch/backup.log
```

Esse horario segue o timezone configurado no sistema da VM. Confira com `date`.

Por padrao, backups com mais de 14 dias sao removidos. Para alterar:

```bash
RETENTION_DAYS=30 ./deploy/backup.sh --install-cron
```

## Restaurar banco manualmente

Exemplo de restauracao de um `.dump`:

```bash
cd ~/petmatch/petmatch-api
docker compose --env-file .env -f docker-compose.yml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < ~/backups/petmatch/petmatch-db-ARQUIVO.dump
```

Faca restauracao com cuidado, porque `--clean --if-exists` apaga objetos existentes antes de recriar.

## Restaurar uploads manualmente

Primeiro descubra o volume de uploads:

```bash
cd ~/petmatch/petmatch-api
api_container="$(docker compose --env-file .env -f docker-compose.yml ps -q api)"
docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/public/uploads"}}{{.Name}}{{end}}{{end}}' "$api_container"
```

Depois restaure o `.tar.gz` no volume encontrado:

```bash
docker run --rm \
  -v NOME_DO_VOLUME:/uploads \
  -v ~/backups/petmatch:/backup \
  alpine sh -c 'cd /uploads && tar -xzf /backup/petmatch-uploads-ARQUIVO.tar.gz'
```

## Observacao importante

Backup salvo apenas na propria VM nao protege contra perda da VM. Copie os arquivos periodicamente para outro lugar, como sua maquina local, outro servidor ou um bucket de storage.
