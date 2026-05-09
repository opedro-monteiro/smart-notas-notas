# PRD: Página de cadastro de cliente (Frontend)

## Introduction / Overview

Este documento orienta o desenvolvimento da **página de cadastro de cliente** do produto Smart Notas, alinhada ao contrato da API REST (`POST /api/clients`). O utilizador autenticado (Clerk) regista um **cliente** (devedor) com nome, contactos opcionais e, se desejar, uma **mensagem de lembrete personalizada** com placeholders. O objetivo é entregar uma experiência de formulário acessível, validada e integrada com o backend, usando **React**, **TanStack Query**, **React Hook Form**, **Zod**, **Tailwind CSS** e **shadcn/ui**.

## Goals

- Permitir criar um cliente com validação espelhando o backend (Zod + RHF).
- Enviar `POST /api/clients` com mutation (TanStack Query), com estados de loading, erro e sucesso.
- Opcionalmente recolher `reminderMessageTemplate` com limite de caracteres e documentação de placeholders.
- UI consistente com design system (shadcn + Tailwind) e boas práticas React.
- Tratar autenticação (token Clerk no cliente HTTP) e erros 401/4xx de forma clara.

## Escopo assumido (sem Q&A bloqueante)

- App React já existe ou será criado no mesmo monorepo; **autenticação via Clerk** no browser (`Authorization: Bearer <token>` ou fetch wrapper do Clerk, conforme padrão do projeto).
- Base URL da API configurável (`VITE_*` / `NEXT_PUBLIC_*` conforme bundler).
- Cadastro = **criação** apenas neste PRD; edição (PATCH) pode ser página separada ou link “editar” futuro.

## User Stories

### US-001: Formulário de cadastro com RHF + Zod

**Description:** As a utilizador autenticado, quero preencher nome, telefone, email e opcionalmente mensagem personalizada, com validação imediata, para evitar erros antes de submeter.

**Acceptance Criteria:**

- [ ] Schema Zod no cliente espelha `CreateClientSchema` do backend: `name` obrigatório (min 1); `phone`, `email` opcionais; `reminderMessageTemplate` opcional, máx. **1600** caracteres (constante igual à API; exportar `MAX_REMINDER_MESSAGE_TEMPLATE_LENGTH` ou duplicar o número 1600 documentado).
- [ ] `email` opcional: se preenchido, deve ser email válido; se vazio, omitir no JSON ou enviar `undefined` conforme convenção do fetcher.
- [ ] Integração com `@hookform/resolvers/zod` (`zodResolver(schema)`).
- [ ] Campos com `FormField` + `FormItem` + `FormLabel` + `FormControl` + `FormMessage` (shadcn Form).
- [ ] `typecheck` / lint do frontend passam.

### US-002: Mutation TanStack Query para criar cliente

**Description:** As a utilizador, quero submeter o formulário e ver feedback de carregamento e resultado, para saber se o cliente foi criado.

**Acceptance Criteria:**

- [ ] `useMutation` com função que chama `POST ${API_URL}/api/clients` com JSON body alinhado ao tipo inferido do Zod.
- [ ] Headers incluem credenciais Clerk (Bearer ou cookie, conforme stack do projeto).
- [ ] `isPending` desativa botão submeter e mostra estado visual (spinner / texto “A guardar…”).
- [ ] Sucesso: `onSuccess` — invalidar query `['clients']` (ou lista equivalente) com `queryClient.invalidateQueries`; toast ou mensagem de sucesso; redirecionar para lista de clientes ou limpar formulário (definir na implementação conforme UX).
- [ ] Erro: mapear `response.status` — 401 mensagem “Sessão expirada”; 4xx mostrar `error` do body se existir; fallback genérico.
- [ ] `typecheck` passa.

### US-003: UI com shadcn + Tailwind

**Description:** As a utilizador, quero uma página legível e responsiva alinhada ao design system.

**Acceptance Criteria:**

- [ ] Layout responsivo (mobile-first) com `container` / espaçamento Tailwind (`gap-4`, `space-y-6`).
- [ ] `Input` (nome, telefone, email); `Textarea` para mensagem personalizada (com contador `X / 1600`).
- [ ] `Button` tipo submit; variante `outline` para cancelar se existir navegação.
- [ ] Tipografia e cores via tokens do tema shadcn (não valores hex soltos sem motivo).
- [ ] **Verify in browser** usando fluxo de dev (viewport móvel e desktop).

### US-004: Documentação de placeholders na UI

**Description:** As a utilizador, quero ver quais variáveis posso usar na mensagem personalizada, para montar o texto com dados do cliente e da dívida.

**Acceptance Criteria:**

- [ ] Bloco de ajuda (Callout, Alert ou texto secundário) listando placeholders suportados pelo backend:
  - `{{clientName}}`, `{{amount}}`, `{{dueDate}}`, `{{dueDateSpoken}}`, `{{sender}}`, `{{companyName}}`
- [ ] Nota clara: **sem** template personalizado, o sistema usa a mensagem padrão.
- [ ] `typecheck` passa.

## Functional Requirements

- **FR-1:** O formulário deve submeter apenas campos permitidos pelo backend: `name`, `phone?`, `email?`, `reminderMessageTemplate?`.
- **FR-2:** `reminderMessageTemplate` vazio ou só espaços deve ser tratado como “sem personalização” (omitir campo ou enviar string vazia conforme o backend normaliza — a API aceita omitir o campo; o backend guarda `null`).
- **FR-3:** Usar **mutation** dedicada (`useCreateClient` ou hook nomeado) encapsulando fetch + tipos, não lógica HTTP espalhada no componente de página.
- **FR-4:** Provider **QueryClientProvider** na raiz da app; em testes/storybook, provider mock quando aplicável.
- **FR-5:** Acessibilidade: labels associados a inputs, `aria-invalid` via RHF + shadcn Form, foco no primeiro erro após submit falhado quando possível (`setFocus` RHF).
- **FR-6:** Não armazenar token em `localStorage` manualmente se o projeto já usar Clerk hooks oficiais; seguir documentação Clerk para chamadas autenticadas à API.

## Contrato da API (referência)

| Método | Rota | Body (JSON) | Respostas relevantes |
|--------|------|-------------|----------------------|
| `POST` | `/api/clients` | Ver Zod abaixo | `201` + `ClientSchema`; `401` `{ error }` |

**Body (criação) — alinhamento com backend:**

```ts
// Espelho conceitual — ajustar nomes ao inferido do teu schema Zod no frontend
{
  "name": string,                    // obrigatório, min 1
  "phone"?: string,
  "email"?: string,
  "reminderMessageTemplate"?: string // máx. 1600 caracteres
}
```

**Resposta 201 — campos úteis na UI:**

- `id`, `name`, `phone`, `email`, `reminderMessageTemplate`, `createdAt`, `userId`

**Autenticação:** todas as rotas `/api/*` do módulo de clientes exigem utilizador autenticado Clerk.

## Stack técnica obrigatória (implementação)

### TanStack Query (React Query)

- **`useMutation`** para `POST /api/clients`.
- Opções recomendadas: `mutationKey` semântico (ex. `['clients', 'create']`), `onSuccess` com `invalidateQueries` da lista de clientes.
- Evitar `useQuery` na página de cadastro para o POST; opcional `useQuery` apenas se a página pré-carregar dados (não é o caso do cadastro simples).

### React Hook Form + Zod

- Um único `schema` Zod partilhado ou `createClientFormSchema` importado de `schemas/client.ts`.
- `defaultValues`: ex. `{ name: '', phone: '', email: '', reminderMessageTemplate: '' }` — converter strings vazias para `undefined` no `onSubmit` antes do fetch se necessário.
- Modo `onSubmit` controlado; evitar duplicar estado React para campos já geridos pelo RHF.

### shadcn/ui

- Componentes sugeridos: `Form`, `Button`, `Input`, `Textarea`, `Label`, opcional `Card` para envolver o formulário, `Separator`, `Alert` para erros de API.
- Instalar via CLI shadcn apenas componentes necessários para não inflar o bundle.

### Tailwind CSS

- Espaçamento e grid com utilitários; evitar CSS modules para este ecrã salvo exceção do time.
- Dark mode: respeitar `class` no `html` se o projeto usar toggle shadcn.

### React — boas práticas

- Página como componente “gordo” só se necessário; preferir **subcomponentes** (`ClientForm`, `PlaceholderHelp`) e hooks (`useCreateClientMutation`).
- **Não** usar `key={random}` em listas estáveis; no formulário, keys fixas.
- Tratar **Strict Mode** (double effect em dev) sem depender de side-effects duplicados na mutation.
- Tipagem **estrita** do body com `z.infer<typeof CreateClientFormSchema>`.

## Non-Goals (Out of Scope)

- CRUD completo de clientes neste PRD (listagem detalhada, DELETE, PATCH) — apenas cadastro; referência a PATCH para contexto futuro.
- Biblioteca de templates reutilizáveis (modelo `MessageTemplate` no backend ainda não exposto).
- Internacionalização (i18n) — PT primeiro; strings hardcoded ou ficheiro único.
- Testes E2E Playwright (opcional follow-up).

## Design Considerations

- Mensagem personalizada pode ir num **accordion** (“Mensagem de lembrete avançada”) para não intimidar utilizadores casuais.
- Contador de caracteres alinhado ao limite 1600 (SMS segmentação; ajustar texto de ajuda se produto mudar o limite).

## Technical Considerations

- **CORS:** API deve autorizar o origin do frontend em produção.
- **Datas:** placeholders `{{dueDate}}` são preenchidos no envio da mensagem, não no cadastro — o formulário só guarda o **template**.
- **Clerk:** garantir que o token é enviado em todas as chamadas `fetch` à API; padronizar um `apiClient` ou `fetchWithAuth`.
- Constante **1600** deve permaneyer alinhada ao backend (`MAX_REMINDER_MESSAGE_TEMPLATE_LENGTH`); idealmente gerar tipos/SDK a partir do OpenAPI no futuro.

## Success Metrics

- Utilizador consegue criar cliente válido em menos de 2 minutos.
- Zero submissões com template acima de 1600 caracteres (validação client-side).
- Lista de clientes atualiza após cadastro sem refresh manual (`invalidateQueries`).

## Open Questions

1. Após sucesso, **redirecionar** para `/clients` ou **ficar na página** com toast?
2. Formato de `phone`: normalizar para E.164 no cliente ou enviar string livre como hoje a API aceita?
3. O frontend vive em **Next.js App Router** ou **Vite SPA**? (afeta variáveis de ambiente e layout.)

---

## Checklist PRD (skill)

- [x] Requisitos funcionais numerados e testáveis.
- [x] User stories com critérios de aceitação verificáveis.
- [x] Secção Non-Goals.
- [x] Documento guardado em `tasks/prd-cadastro-cliente.md`.
