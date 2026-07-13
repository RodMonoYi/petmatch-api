#!/usr/bin/env bash
set -Eeuo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${API_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
ENV_FILE="${ENV_FILE:-$API_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$API_DIR/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/petmatch}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
LOG_FILE="${LOG_FILE:-$BACKUP_DIR/backup.log}"
DB_SERVICE="${DB_SERVICE:-db}"
API_SERVICE="${API_SERVICE:-api}"
UPLOADS_PATH="${UPLOADS_PATH:-/app/public/uploads}"
LOCK_FILE="${LOCK_FILE:-/tmp/petmatch-backup.lock}"

usage() {
  cat <<USAGE
Uso:
  ./deploy/backup.sh
  ./deploy/backup.sh --install-cron

Variaveis opcionais:
  API_DIR=/home/ubuntu/petmatch/petmatch-api
  ENV_FILE=/home/ubuntu/petmatch/petmatch-api/.env
  COMPOSE_FILE=/home/ubuntu/petmatch/petmatch-api/docker-compose.yml
  BACKUP_DIR=/home/ubuntu/backups/petmatch
  RETENTION_DAYS=14
  DB_SERVICE=db
  API_SERVICE=api
  UPLOADS_PATH=/app/public/uploads

O backup salva:
  - Banco PostgreSQL em formato .dump
  - Uploads da API em .tar.gz
  - Manifesto com commit do backend e checksums
USAGE
}

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_file() {
  if [ ! -f "$1" ]; then
    log "Arquivo nao encontrado: $1"
    exit 1
  fi
}

require_dir() {
  if [ ! -d "$1" ]; then
    log "Diretorio nao encontrado: $1"
    exit 1
  fi
}

install_cron() {
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"

  local script_path
  script_path="$(realpath "$0")"
  local cron_line
  cron_line="0 2 * * * API_DIR=\"$API_DIR\" ENV_FILE=\"$ENV_FILE\" COMPOSE_FILE=\"$COMPOSE_FILE\" BACKUP_DIR=\"$BACKUP_DIR\" RETENTION_DAYS=\"$RETENTION_DAYS\" /bin/bash \"$script_path\" >> \"$LOG_FILE\" 2>&1"

  log "Instalando agendamento diario as 02:00..."
  (crontab -l 2>/dev/null | grep -vF "$script_path" || true; printf '%s\n' "$cron_line") | crontab -
  log "Cron instalado. Confira com: crontab -l"
}

git_commit_for() {
  local repo_dir="$1"
  if [ -d "$repo_dir/.git" ]; then
    git -C "$repo_dir" rev-parse HEAD 2>/dev/null || printf 'desconhecido'
  else
    printf 'nao encontrado'
  fi
}

backup_uploads_volume() {
  local uploads_backup="$1"
  local api_container uploads_volume uploads_backup_name

  api_container="$("${compose[@]}" ps -q "$API_SERVICE" || true)"
  if [ -z "$api_container" ]; then
    log "Container $API_SERVICE nao encontrado. Pulando backup dos uploads."
    return 1
  fi

  uploads_volume="$(
    docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$UPLOADS_PATH\"}}{{.Name}}{{end}}{{end}}" "$api_container"
  )"

  if [ -z "$uploads_volume" ]; then
    log "Volume montado em $UPLOADS_PATH nao encontrado. Pulando backup dos uploads."
    return 1
  fi

  log "Gerando backup dos uploads..."
  uploads_backup_name="$(basename "$uploads_backup")"
  docker run --rm \
    -v "$uploads_volume:/uploads:ro" \
    -v "$BACKUP_DIR:/backup" \
    alpine sh -c 'cd /uploads && tar -czf "/backup/$1" .' sh "$uploads_backup_name"
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

if [ "${1:-}" = "--install-cron" ]; then
  install_cron
  exit 0
fi

require_dir "$API_DIR"
require_file "$ENV_FILE"
require_file "$COMPOSE_FILE"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Ja existe um backup em andamento."
  exit 1
fi

cd "$API_DIR"
compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

timestamp="$(date '+%Y-%m-%d_%H-%M-%S')"
db_backup="$BACKUP_DIR/petmatch-db-$timestamp.dump"
uploads_backup="$BACKUP_DIR/petmatch-uploads-$timestamp.tar.gz"
manifest="$BACKUP_DIR/petmatch-manifest-$timestamp.txt"

log "Iniciando backup do PetMatch..."

log "Validando docker-compose..."
"${compose[@]}" config >/dev/null

log "Gerando backup do banco PostgreSQL..."
"${compose[@]}" exec -T "$DB_SERVICE" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$db_backup"

if ! backup_uploads_volume "$uploads_backup"; then
  uploads_backup=""
fi

api_commit="$(git_commit_for "$API_DIR")"
{
  printf 'Backup PetMatch\n'
  printf 'Data: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
  printf 'API dir: %s\n' "$API_DIR"
  printf 'API commit: %s\n' "$api_commit"
  printf '\nArquivos:\n'
  printf '%s\n' "- $db_backup"
  [ -n "$uploads_backup" ] && printf '%s\n' "- $uploads_backup"
  printf '\nChecksums SHA256:\n'
  sha256sum "$db_backup"
  [ -n "$uploads_backup" ] && sha256sum "$uploads_backup"
} > "$manifest"

if [ "$RETENTION_DAYS" -gt 0 ]; then
  log "Removendo backups com mais de $RETENTION_DAYS dias..."
  find "$BACKUP_DIR" -type f \( \
    -name 'petmatch-db-*.dump' -o \
    -name 'petmatch-uploads-*.tar.gz' -o \
    -name 'petmatch-manifest-*.txt' \
  \) -mtime +"$RETENTION_DAYS" -delete
fi

log "Backup concluido:"
log "Banco: $db_backup"
[ -n "$uploads_backup" ] && log "Uploads: $uploads_backup"
log "Manifesto: $manifest"
