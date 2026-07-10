# Kureimo — Frontend

Plataforma de claim de photocards para a comunidade kpop do Brasil. Conecta collectors com Group Order Managers (GOMs) que coordenam compras internacionais de photocards.

---

## Stack

- React 18 + Vite
- React Router v6 — navegação SPA
- @logto/react — autenticação via Logto (self-hosted em auth.kureimo.com)
- @microsoft/signalr — tempo real para claims e unclaims
- CSS Modules + variáveis globais (sem dependência de UI lib)
- lucide-react — iconografia

---

## Setup

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

---

## Estrutura do projeto

```
src/
├── api/
│   └── client.js                 # Endpoints REST + injeção do token Logto
├── components/
│   ├── Logo.jsx                  # Logo (public/logo-icon.png + public/logo-text.png)
│   ├── Navbar.jsx                # Barra de navegação com auth via Logto
│   ├── OnboardingModal.jsx       # Modal de onboarding para novos usuários (email + papel)
│   ├── CreateSetModal.jsx        # Modal criação de set em 2 steps (info + visual)
│   ├── EditSetModal.jsx          # Modal edição de set
│   ├── AddPhotocardModal.jsx     # Modal adicionar membro ao set
│   ├── ClaimRankModal.jsx        # Modal ranking de claims com tempo real
│   ├── ConfirmModal.jsx          # Modal de confirmação genérico
│   ├── ImageCropModal.jsx        # Modal de recorte de imagem
│   └── DeleteAccountModal.jsx    # Modal confirmação exclusão de conta
├── contexts/
│   ├── AuthContext.jsx           # Estado global de auth integrado ao Logto SDK
│   └── ToastContext.jsx          # Sistema de notificações (toasts)
├── hooks/
│   ├── useSignalR.js             # Conexão SignalR com token Logto
│   └── useCountdown.js           # Countdown com fases: waiting / streaming / open / closed
├── pages/
│   ├── Home.jsx                  # Landing page
│   ├── SetPage.jsx               # Página principal do claim
│   ├── Dashboard.jsx             # Painel GOM (lista de sets)
│   ├── ProfilePage.jsx           # Perfil do usuário
│   └── GomProfilePage.jsx        # Perfil público do GOM com avaliações
└── styles/
    └── global.css                # Design system completo
```

---

## Autenticação

O projeto usa o Logto como provedor de autenticação hospedado em `auth.kureimo.com`. Não há telas de login ou cadastro próprias — o usuário é redirecionado para a experiência do Logto ao clicar em "Entrar / Cadastrar".

### Fluxo de login

1. Usuário clica em "Entrar / Cadastrar" — `signIn()` redireciona para o Logto
2. Logto autentica (username/telefone/senha + MFA por SMS) e redireciona para `/callback`
3. O SDK troca o code por tokens automaticamente
4. O `AuthContext` chama `GET /users/me` para hidratar o estado do app
5. Se `profileCompleted === false`, o `OnboardingModal` é exibido antes de liberar a navegação

### Onboarding

Novos usuários precisam completar dois campos antes de usar a plataforma:

- E-mail de recuperação de conta
- Papel: GOM (cria e gerencia sets) ou Collector (dá claim nos photocards)

Enviado via `POST /users/me/complete-onboarding`.

### Gerenciamento de dados

Username, e-mail, telefone e senha são gerenciados pelo Account Center do Logto em `auth.kureimo.com/account/security`. A foto de perfil é gerenciada pelo backend próprio via `PUT /users/{id}/profile-pic`.

---

## Fluxo de claim em tempo real

1. O `useCountdown` monitora `set.claimOpensAt` e `set.status`
2. Quando falta 10 minutos ou menos: fase `streaming` — SignalR conecta
3. Quando o horário chega: fase `open` — botões de claim ativam
4. O `phase` nunca vai para `closed` pelo frontend — só o backend encerra via `set.status === 'Closed'`
5. Eventos recebidos via SignalR:
   - `ClaimRegistered` — adiciona claim ao ranking do photocard
   - `ClaimRemoved` — remove claim do ranking
   - `ClaimUpdated` — substitui a lista completa com posições atualizadas

O `ClaimRankModal` também escuta esses eventos em tempo real enquanto está aberto.

---

## Unclaim

Após dar claim, o usuário tem uma janela de 6 minutos para desfazer a ação (o backend bloqueia após 5 minutos; o frontend bloqueia após 6 para dar margem). O timestamp do claim é salvo no estado local e recuperado do campo `claimedAt` da API ao carregar a página, garantindo que o botão de unclaim apareça corretamente após recarregar.

---

## Papéis

| Role | Acesso |
|------|--------|
| Collector | Ver sets via link, dar e desfazer claim |
| GOM (role `Gon`) | Tudo acima + criar sets, adicionar membros, publicar, abrir e fechar claim |

GOMs só enxergam os membros sem blur no set que eles mesmos criaram. Em sets de outros GOMs, o comportamento é idêntico ao de um Collector.

---

## Avaliações de GOMs

Collectors podem avaliar GOMs com nota de 1 a 5 estrelas e comentário obrigatório. A avaliação é criada ou atualizada via `POST /users/{id}/reviews`. O perfil público do GOM (`/gom/:id`) exibe a nota média, o total de avaliações e os sets publicados.

---

## Personalização de sets

O GOM pode definir para cada set:

- Imagem de capa (upload com recorte 16:9)
- Cor de fundo
- Cor da fonte
- Família tipográfica (19 opções disponíveis)

Essas configurações são aplicadas visualmente na página do set.

---

## Identidade visual do Logto

As telas do Logto (login, cadastro, verificação e Account Center) são customizadas via CSS no Console do Logto em Sign-in & account > Branding > Custom CSS. O CSS usa seletores baseados em `#app` e atributos `class*=` conforme a estrutura interna do Logto, e importa as fontes Nunito e DM Serif Display do Google Fonts para manter consistência com o design system do Kureimo.