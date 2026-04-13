# Kurtto Admin GUI

Painel administrativo do Kurtto (SPA em React + TypeScript).

## Stack

- Create React App (TypeScript, modo strict)
- React 18 e React Router 6
- Bootstrap 5.3.8 (CSS/JS via pacote `bootstrap`, sem react-bootstrap)
- Estilos globais em `src/assets/styles/` (variáveis Kurtto + overrides)

## Pré-requisitos

- Node.js 24 (veja `.nvmrc`) **ou** apenas Docker com Docker Compose

## Rodar localmente (host)

```bash
npm install
npm start
```

A aplicação abre em [http://localhost:3000](http://localhost:3000) (ou na porta definida em `PORT`).

### Variáveis de ambiente

Copie `.env.example` para `.env.local` e ajuste se necessário. Não commite segredos.

## Rodar com Docker (desenvolvimento)

Com hot reload; `node_modules` fica no volume anônimo do container (alinhado ao que foi instalado na imagem).

```bash
docker compose build app
docker compose up app
```

- URL: [http://localhost:3000](http://localhost:3000)
- Porta: `PORT` no host mapeada para `3000` no container (ex.: `PORT=3001 docker compose up app`)

## Build de produção em container (nginx)

```bash
docker compose --profile production build web
docker compose --profile production up web
```

- URL: [http://localhost:8080](http://localhost:8080) (ou `WEB_PORT` no host)

## Qualidade

Execute **sempre dentro do container** (recomendado):

```bash
# Rebuild da imagem quando package*.json, Dockerfile ou dependências mudarem
docker compose build app

# Checks de qualidade
docker compose run --rm app npm run lint
docker compose run --rm app npm run lint:fix
docker compose run --rm app npx tsc --noEmit
docker compose run --rm app npm test -- --watchAll=false
docker compose run --rm app npm run build
```

### Política mínima de vulnerabilidades (CRA)

O projeto usa `react-scripts` (Create React App), que pode carregar vulnerabilidades transitivas conhecidas sem correção direta no curto prazo. Como mitigação com governança explícita:

- o CI executa `npm audit` com foco em severidade `high`/`critical`;
- o merge é bloqueado para qualquer risco não mapeado;
- exceções temporárias e rastreáveis ficam em `security/audit-exceptions.json` com `owner`, `expiresAt` e motivo;
- riscos residuais devem ser reavaliados no vencimento da exceção ou quando houver patch compatível.

## SonarCloud (GitHub Actions)

O workflow `.github/workflows/sonarcloud.yml` envia análise para o SonarCloud em **push** para **`main`** e em **pull request** com base em **`main`** ou **`development`** (alinhado ao fluxo de integração do repositório).

### Pré-requisitos no GitHub

1. **Projeto no SonarCloud**  
   Crie/importe o repositório em [SonarCloud](https://sonarcloud.io/) e anote a **Organization key** e o **Project key** (Administration do projeto/organização).

2. **Secret** (repositório ou organização GitHub)  
   - `SONAR_TOKEN` — token de análise gerado no SonarCloud (nunca commite nem registre em logs).

3. **Configuração do projeto SonarCloud** (repositório ou organização GitHub)  
   - `SONAR_ORGANIZATION` — organization key do SonarCloud (**aceita Variables ou Secrets**).  
   - `SONAR_PROJECT_KEY` — project key do SonarCloud (**aceita Variables ou Secrets**).

Se `SONAR_TOKEN`, `SONAR_ORGANIZATION` ou `SONAR_PROJECT_KEY` estiverem ausentes, o job **falha na primeira etapa** com mensagens indicando o que configurar. O token só é referenciado via `secrets.SONAR_TOKEN`, sem hardcode no repositório.

O escopo de análise e cobertura (LCOV após `npm test -- --coverage`) está em `sonar-project.properties`.

## Estrutura principal

- `public/` — HTML estático e manifest
- `src/` — código da aplicação
- `sonar-project.properties` — escopo e relatórios LCOV para SonarCloud
- `.github/workflows/` — CI (inclui `ci.yml` e `sonarcloud.yml`)
- `Dockerfile` — alvos `development` (Node + `npm start`) e `production` (build estático + nginx)
- `docker-compose.yml` — serviço `app` (dev); serviço `web` com perfil `production`
