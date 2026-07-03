# Deploy da API com Docker Compose

Este compose sobe apenas o backend da VM: PostgreSQL e API NestJS. O frontend
continua hospedado na Vercel.

## Primeira subida na VM

Rode dentro de `~/petmatch/petmatch-api`:

```bash
cp .env.docker.example .env
nano .env
docker compose up -d --build
```

No `.env`, ajuste pelo menos:

```env
APP_ORIGIN=https://seu-app.vercel.app
API_PORT=3000
POSTGRES_PASSWORD=uma-senha-forte
JWT_SECRET=um-segredo-forte
JWT_REFRESH_SECRET=outro-segredo-forte
```

Depois abra:

```text
http://IP_DA_VM:3000/api/docs
```

Na Vercel, configure o frontend para apontar para a API publicada pela VM:

```env
VITE_API_URL=http://IP_DA_VM:3000/api
```

Em produção com o frontend em HTTPS, prefira publicar a API também em HTTPS
com domínio próprio e usar esse domínio no `VITE_API_URL`.

## O que fica persistido

- Banco PostgreSQL: volume `postgres_data`
- Uploads da API: volume `api_uploads`

## Schema do banco

A API roda migrations automaticamente no start por causa de:

```env
DATABASE_MIGRATIONS_RUN=true
DATABASE_SYNCHRONIZE=false
```

Para ver logs:

```bash
docker compose logs -f api
docker compose logs -f db
```

Para atualizar depois de um `git pull`:

```bash
docker compose up -d --build
```

Para rodar o seed na VM:

```bash
docker compose --profile tools run --rm seed
```

O seed limpa os dados atuais e recria os registros de teste.

Para parar sem apagar dados:

```bash
docker compose down
```

Para apagar banco e uploads:

```bash
docker compose down -v
```
