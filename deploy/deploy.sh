#!/usr/bin/env bash
set -Eeuo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${API_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
ENV_FILE="${ENV_FILE:-$API_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$API_DIR/docker-compose.yml}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
RUN_BACKUP_BEFORE_DEPLOY="${RUN_BACKUP_BEFORE_DEPLOY:-true}"
COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"
ALLOW_DIRTY="${ALLOW_DIRTY:-false}"
PRUNE_DANGLING_IMAGES="${PRUNE_DANGLING_IMAGES:-false}"
LOCK_FILE="${LOCK_FILE:-/tmp/petmatch-deploy.lock}"

usage() {
  cat <<USAGE
Uso:
  ./deploy/deploy.sh

Variaveis opcionais:
  API_DIR=/home/ubuntu/petmatch/petmatch-api    Diretorio do backend/compose.
  ENV_FILE=/home/ubuntu/petmatch/petmatch-api/.env
  COMPOSE_FILE=/home/ubuntu/petmatch/petmatch-api/docker-compose.yml
  DEPLOY_BRANCH=main                            Branch a publicar. Se vazio, usa a branch atual do backend.
  DEPLOY_REMOTE=origin                          Remote Git usado no pull.
  RUN_BACKUP_BEFORE_DEPLOY=true                 Faz backup antes do deploy.
  COMPOSE_PARALLEL_LIMIT=1                      Melhor para VM pequena da Oracle.
  ALLOW_DIRTY=false                             Permite deploy com alteracoes locais rastreadas.
  PRUNE_DANGLING_IMAGES=false                   Remove imagens Docker soltas apos deploy.

Exemplos:
  ./deploy/deploy.sh
  DEPLOY_BRANCH=main ./deploy/deploy.sh
  RUN_BACKUP_BEFORE_DEPLOY=false ./deploy/deploy.sh
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

update_api_repo() {
  require_dir "$API_DIR/.git"

  log "Atualizando backend: $API_DIR"
  cd "$API_DIR"

  if [ "$ALLOW_DIRTY" != "true" ]; then
    if ! git diff --quiet || ! git diff --cached --quiet; then
      log "Existem alteracoes locais rastreadas em $API_DIR."
      git status --short
      log "Resolva antes do deploy ou use ALLOW_DIRTY=true."
      exit 1
    fi
  fi

  local current_branch branch before_commit after_commit
  current_branch="$(git branch --show-current)"
  branch="${DEPLOY_BRANCH:-$current_branch}"
  if [ -z "$branch" ]; then
    log "Nao consegui identificar a branch em $API_DIR. Informe DEPLOY_BRANCH=main."
    exit 1
  fi

  before_commit="$(git rev-parse HEAD)"
  git fetch --prune "$DEPLOY_REMOTE"

  if git rev-parse --verify "$branch" >/dev/null 2>&1; then
    git checkout "$branch"
  else
    git checkout -B "$branch" "$DEPLOY_REMOTE/$branch"
  fi

  git pull --ff-only "$DEPLOY_REMOTE" "$branch"
  after_commit="$(git rev-parse HEAD)"

  if [ "$before_commit" = "$after_commit" ]; then
    log "Backend ja estava atualizado em $after_commit."
  else
    log "Backend atualizado de $before_commit para $after_commit."
  fi
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

require_dir "$API_DIR"
require_file "$ENV_FILE"
require_file "$COMPOSE_FILE"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Ja existe um deploy em andamento."
  exit 1
fi

log "Iniciando deploy do PetMatch..."

update_api_repo

if [ "$RUN_BACKUP_BEFORE_DEPLOY" = "true" ]; then
  log "Executando backup antes do deploy..."
  /bin/bash "$SCRIPT_DIR/backup.sh"
else
  log "Backup pre-deploy pulado por configuracao."
fi

cd "$API_DIR"
compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

log "Validando docker-compose..."
"${compose[@]}" config >/dev/null

log "Subindo containers com rebuild..."
COMPOSE_PARALLEL_LIMIT="$COMPOSE_PARALLEL_LIMIT" "${compose[@]}" up -d --build --remove-orphans

log "Aguardando API responder..."
api_ok=false
for _ in $(seq 1 30); do
  if "${compose[@]}" exec -T api node -e "fetch('http://localhost:3000/api/docs').then((r)=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    api_ok=true
    break
  fi
  sleep 2
done

if [ "$api_ok" != "true" ]; then
  log "A API nao respondeu dentro do tempo esperado. Veja logs com:"
  log "cd \"$API_DIR\" && docker compose --env-file \"$ENV_FILE\" -f \"$COMPOSE_FILE\" logs -f api"
  exit 1
fi

if [ "$PRUNE_DANGLING_IMAGES" = "true" ]; then
  log "Removendo imagens antigas soltas..."
  docker image prune -f
fi

log "Status dos containers:"
"${compose[@]}" ps

log "Deploy concluido com sucesso."
