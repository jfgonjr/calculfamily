# Calculadora Familioa

PWA mobile-first para a família (Adriana, Zé Chico, Junior, Camila e Maura) lançar despesas/receitas
e fazer o acerto de contas mensal, com sincronização em tempo real.

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS 3 · Supabase (Postgres, Auth, Realtime, RLS) · Recharts · Lucide.

## O que o app faz

| Aba | Conteúdo |
|---|---|
| **Início** | Saldo, receitas, despesas, barra de orçamento (verde/amarelo/vermelho), gastos por membro (gráfico + ranking) e por categoria (rosca) |
| **Lançamentos** | Lista por dia, busca e filtros (tipo, status, membro, categoria), editar/excluir, botão flutuante **+** |
| **Acertos** | Escolhe quem divide, mostra "X deve R$ Y para Z", saldo individual, copiar/compartilhar (WhatsApp etc.) |
| **Família** | Editar nome/cor, orçamento mensal (admin), lista de membros, sair |

Seletor de mês/ano fixo no topo; barra de navegação inferior; instalável na tela inicial (PWA).

## Estrutura

```
├── supabase/migrations/
│   ├── 001_schema.sql        # tabelas, funções, triggers, RLS, Realtime
│   └── 002_seed.sql          # 5 membros + transações do mês atual (só para teste)
├── public/                   # sw.js, offline.html, icons/
├── scripts/test-settlement.ts# teste do algoritmo de acerto
└── src/
    ├── app/
    │   ├── layout.tsx, manifest.ts, globals.css
    │   ├── login/page.tsx            # e-mail/senha + Magic Link
    │   ├── auth/callback/route.ts    # retorno do Magic Link
    │   └── (app)/                    # área protegida
    │       ├── layout.tsx            # providers, cabeçalho, BottomNav
    │       ├── page.tsx              # Início (dashboard)
    │       ├── lancamentos/page.tsx
    │       ├── acertos/page.tsx
    │       └── perfil/page.tsx
    ├── components/
    │   ├── providers/FamilyProvider.tsx   # dados + Realtime + mês selecionado
    │   ├── transactions/                  # TransactionForm, EditorProvider (FAB)
    │   ├── layout/                        # BottomNav, MonthPicker, AppHeader, RegisterSW
    │   └── ui/avatar.tsx
    ├── lib/
    │   ├── supabase/{client,server,middleware}.ts
    │   ├── settlement.ts   # algoritmo de acerto (em centavos)
    │   └── format.ts       # BRL, datas, parse de "1.234,56"
    ├── middleware.ts       # renova sessão e protege rotas
    └── types/index.ts
```

## Passo a passo para colocar no ar

### 1. Supabase
1. Crie um projeto em https://supabase.com (plano gratuito).
2. **SQL Editor** → rode `001_schema.sql`, depois `002_seed.sql` (dados de teste).
3. **Authentication → URL Configuration**: em *Site URL* coloque a URL da Vercel (ex.: `https://familioa.vercel.app`) e adicione `https://familioa.vercel.app/auth/callback` em *Redirect URLs* (e `http://localhost:3000/auth/callback` para testes locais).
4. **Settings → API**: copie *Project URL* e *anon public key*.

### 2. Rodar localmente
```bash
cp .env.example .env.local     # preencha URL e anon key
npm install
npm run dev                    # http://localhost:3000
npm run test:settlement        # testa o cálculo de acertos
```
Login de teste: `adriana@familioa.test` / `familioa123` (idem `zechico@`, `junior@`, `camila@`, `maura@`).

### 3. Vercel
Importe o repositório na Vercel, defina as duas variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` e faça o deploy.

### 4. Instalar no celular
- **Android (Chrome):** menu ⋮ → *Instalar app*.
- **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*.

### 5. Passar para os acessos reais (antes de usar de verdade)
1. Em **Authentication → Users**, apague os 5 usuários `@familioa.test`.
2. Crie cada pessoa com **Add user** (e-mail + senha) e, em *User Metadata*, cole (use o `id` da família da tabela `families`):
   `{"family_id": "<uuid>", "full_name": "Maura", "color": "#8b5cf6"}`
   O perfil nasce automaticamente. Para tornar alguém administrador: `update profiles set role = 'admin' where full_name = 'Adriana';`
3. Apague as transações de teste: `delete from transactions;`

## Regras de negócio

- **Acerto** considera só despesas com status **Pago**; pendentes aparecem em aviso e entram quando forem pagas.
- Divisão **igual** entre os participantes marcados; é possível tirar alguém da divisão na tela Acertos.
- Cálculo em **centavos** (sem erro de arredondamento); os centavos que sobram são distribuídos 1 a 1 e a soma dos saldos é sempre zero.
- Transferências geradas por casamento guloso (maior devedor → maior credor), o que mantém o número de PIX pequeno.
- Receitas não entram no acerto, só nos totais do Início.

## Segurança

- **RLS** em todas as tabelas: cada usuário só enxerga e altera dados da própria família.
- Triggers impedem lançar transação com membro ou categoria de outra família.
- O perfil não consegue trocar de família; só administradores alteram o orçamento.
- O Magic Link usa `shouldCreateUser: false`: ninguém de fora cria conta sozinho.
- A chave `anon` é pública por desenho; quem protege os dados é o RLS. Nunca coloque a `service_role` no app.
- O service worker **não** guarda dados financeiros em cache.

## Limitações conhecidas

- Sem modo offline: sem internet o app mostra uma tela de "Sem conexão".
- Não há tela para criar/editar categorias (use o Table Editor do Supabase por enquanto).
- Não foi testado contra um projeto Supabase real nem em aparelho físico: o código compila e o algoritmo de acerto tem teste, mas o fluxo completo (login, Realtime, RLS) precisa ser validado depois do passo 1.
