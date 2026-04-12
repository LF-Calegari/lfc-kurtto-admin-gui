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
docker compose run --rm app npm run lint
docker compose run --rm app npx tsc --noEmit
docker compose run --rm app npm test -- --watchAll=false
docker compose run --rm app npm run build
```

## Estrutura principal

- `public/` — HTML estático e manifest
- `src/` — código da aplicação
- `Dockerfile` — alvos `development` (Node + `npm start`) e `production` (build estático + nginx)
- `docker-compose.yml` — serviço `app` (dev); serviço `web` com perfil `production`
