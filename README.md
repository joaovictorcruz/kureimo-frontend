# 🍦 Kureimo — Plataforma de Claim de Photocards

> Feito para a comunidade kpop do Brasil 

## Stack

- **React 18** + **Vite**
- **React Router v6** — navegação SPA
- **@microsoft/signalr** — tempo real para claims
- CSS Modules + variáveis globais (sem dependência de UI lib)

## Setup

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

## Estrutura

```
src/
├── api/
│   └── client.js          # Todos os endpoints da API (dev: localhost:7011)
├── components/
│   ├── Logo.jsx            # Logo SVG (sorvete + photocard)
│   ├── Navbar.jsx          # Barra de navegação com auth
│   ├── AuthModal.jsx       # Modal login/cadastro
│   ├── PhotocardCard.jsx   # Card do photocard com claim + ranking
│   ├── CreateSetModal.jsx  # Modal criação de set (2 steps + tema)
│   └── AddPhotocardModal.jsx # Modal adicionar photocard
├── contexts/
│   ├── AuthContext.jsx     # Auth state global (JWT decode)
│   └── ToastContext.jsx    # Sistema de notificações
├── hooks/
│   ├── useSignalR.js       # Hook SignalR (abre ±10min do claim)
│   └── useCountdown.js     # Countdown com fases: waiting/streaming/open/closed
├── pages/
│   ├── Home.jsx            # Landing page
│   ├── SetPage.jsx         # Página principal do claim
│   └── Dashboard.jsx       # Painel GOM
└── styles/
    └── global.css          # Design system completo
```

## Ambientes

| Variável | Dev | Prod |
|----------|-----|------|
| API Base | `http://localhost:7011` | `https://api.kureimo.com` |
| SignalR  | `http://localhost:7011/hubs/claims` | `https://api.kureimo.com/hubs/claims` |

Para trocar o ambiente, basta rodar `npm run build` — o Vite usa `import.meta.env.MODE` automaticamente.

## Fluxo de Claim em Tempo Real

1. O `useCountdown` monitora `set.claimOpensAt`
2. Quando falta ≤ 10 minutos → fase `streaming` → SignalR conecta
3. Quando passa do horário → fase `open` → botão de claim ativa
4. Quando passa +10 minutos → fase `closed` → SignalR desconecta
5. Eventos `ClaimReceived` chegam via hub e atualizam o ranking em tempo real

## Personalização de Sets

O modal de criação tem 6 temas pré-definidos + opções de fonte. Futuramente, o `theme` pode ser persistido na API adicionando campos ao `CreateSetDto`.

## Papéis

| Role | Acesso |
|------|--------|
| User | Ver sets (via link), dar claim |
| GOM (`isGon: true`) | + Criar sets, adicionar photocards, publicar, abrir/fechar |
| Admin | (reservado para futuro) |
