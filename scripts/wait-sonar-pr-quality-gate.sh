#!/usr/bin/env bash
# Espera o Quality Gate do SonarCloud para uma PR, com resolução automática da project key.
#
# Problema comum: a API retorna "Component ... of pull request ... not found" quando
# SONAR_PROJECT_KEY não bate com o nome registrado no SonarCloud. Neste repositório
# já ocorreu o projeto criado como LF-Calegari_lfc-kurrto-admin-gui (typo "kurrto") em
# vez de ...kurtto... — por isso o script tenta candidatas em ordem antes de fazer polling.
#
# Uso:
#   SONAR_TOKEN_PATH=./.credentials/sonar.token ./scripts/wait-sonar-pr-quality-gate.sh 42
#   SONAR_PROJECT_KEY=LF-Calegari_lfc-kurrto-admin-gui ./scripts/wait-sonar-pr-quality-gate.sh 42
#
# Variáveis opcionais:
#   SONAR_ORGANIZATION (default: lf-calegari)
#   SONAR_TOKEN_PATH
#   SONAR_PROJECT_KEY — se definida, é tentada primeiro; depois as demais candidatas
#   SONAR_MAX_WAIT_SEC — tempo máximo após encontrar a PR no Sonar (default: 600)
#   SONAR_POLL_INTERVAL_SEC — intervalo entre polls (default: 15)
#
# Saída:
#   0 — Quality Gate OK
#   1 — Quality Gate ERROR ou WARN
#   2 — Nenhuma project key funcionou ou token inválido
#   3 — Timeout aguardando análise / status final

set -euo pipefail

PR_NUMBER="${1:?Uso: $0 <numero-da-pr>}"

SONAR_ORGANIZATION="${SONAR_ORGANIZATION:-lf-calegari}"
SONAR_TOKEN_PATH="${SONAR_TOKEN_PATH:-./.credentials/sonar.token}"
SONAR_MAX_WAIT_SEC="${SONAR_MAX_WAIT_SEC:-600}"
SONAR_POLL_INTERVAL_SEC="${SONAR_POLL_INTERVAL_SEC:-15}"

if [[ ! -f "$SONAR_TOKEN_PATH" ]]; then
  echo "ERRO: token não encontrado: $SONAR_TOKEN_PATH" >&2
  exit 2
fi

export SONAR_TOKEN
SONAR_TOKEN="$(tr -d '\r\n' <"$SONAR_TOKEN_PATH")"
if [[ -z "$SONAR_TOKEN" ]]; then
  echo "ERRO: SONAR_TOKEN vazio" >&2
  exit 2
fi

# Ordem: chave explícita primeiro; depois a registrada historicamente no Sonar (typo); depois o nome "correto".
DEFAULT_KEYS=(
  "LF-Calegari_lfc-kurrto-admin-gui"
  "LF-Calegari_lfc-kurtto-admin-gui"
)

CANDIDATES=()
if [[ -n "${SONAR_PROJECT_KEY:-}" ]]; then
  CANDIDATES+=("$SONAR_PROJECT_KEY")
fi
for k in "${DEFAULT_KEYS[@]}"; do
  skip=
  for c in "${CANDIDATES[@]}"; do
    [[ "$c" == "$k" ]] && skip=1 && break
  done
  [[ -n "$skip" ]] || CANDIDATES+=("$k")
done

fetch_status() {
  local key="$1"
  curl -sS -u "$SONAR_TOKEN:" \
    "https://sonarcloud.io/api/qualitygates/project_status?organization=${SONAR_ORGANIZATION}&projectKey=${key}&pullRequest=${PR_NUMBER}"
}

RESOLVED_KEY=""
RESP=""

for key in "${CANDIDATES[@]}"; do
  RESP="$(fetch_status "$key")" || true
  if echo "$RESP" | grep -q '"errors"'; then
    if echo "$RESP" | grep -qi 'not found'; then
      echo "Sonar: project key sem análise para esta PR (tentativa): $key" >&2
      continue
    fi
    echo "Sonar API erro inesperado (key=$key): $RESP" >&2
    exit 2
  fi
  if echo "$RESP" | grep -q '"projectStatus"'; then
    RESOLVED_KEY="$key"
    echo "Sonar: usando projectKey=$RESOLVED_KEY para PR #${PR_NUMBER}" >&2
    break
  fi
  echo "Sonar: resposta sem projectStatus (key=$key)" >&2
done

if [[ -z "$RESOLVED_KEY" ]]; then
  echo "" >&2
  echo "ERRO: nenhuma SONAR_PROJECT_KEY candidata funcionou para a PR #${PR_NUMBER}." >&2
  echo "Confira no SonarCloud (Administration → projeto) o **Project key** exato e exporte:" >&2
  echo "  export SONAR_PROJECT_KEY='...'" >&2
  echo "Candidatas tentadas: ${CANDIDATES[*]}" >&2
  exit 2
fi

deadline=$((SECONDS + SONAR_MAX_WAIT_SEC))

while true; do
  RESP="$(fetch_status "$RESOLVED_KEY")"
  if echo "$RESP" | grep -q '"errors"'; then
    echo "Sonar: erro ao reconsultar gate: $RESP" >&2
    exit 2
  fi

  if echo "$RESP" | grep -q '"status":"OK"'; then
    echo "$RESP" | head -c 800
    echo
    echo "GATE_OK (projectKey=$RESOLVED_KEY)"
    exit 0
  fi

  if echo "$RESP" | grep -qE '"status":"ERROR"|"status":"WARN"'; then
    echo "$RESP" | head -c 1200
    echo
    echo "GATE_NOT_OK (projectKey=$RESOLVED_KEY)" >&2
    exit 1
  fi

  # Ex.: status NONE ou análise ainda não publicada no endpoint
  if (( SECONDS >= deadline )); then
    echo "Timeout (${SONAR_MAX_WAIT_SEC}s) aguardando Quality Gate final para PR #${PR_NUMBER}." >&2
    echo "Última resposta (trecho): ${RESP:0:500}..." >&2
    exit 3
  fi
  echo "--- aguardando análise Sonar (PR #${PR_NUMBER}, key=$RESOLVED_KEY) — próximo poll em ${SONAR_POLL_INTERVAL_SEC}s ---"
  sleep "$SONAR_POLL_INTERVAL_SEC"
done
