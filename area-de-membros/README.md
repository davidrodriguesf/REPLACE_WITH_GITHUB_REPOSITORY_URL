# Área de Membros + Comunidade

Área de membros própria, sem taxa de plataforma, com:

- **Cursos pagos**: liberados automaticamente quando a Appmax confirma o pagamento (webhook).
- **Cursos gratuitos**: o aluno não paga, mas **quem libera é o administrador**. O aluno vê o curso e clica em "Solicitar acesso"; você aprova no painel. Você também pode liberar direto pelo e-mail.
- **Cursos bloqueados com cadeado**: o aluno vê tudo o que existe e o que ainda não tem.
- **Comunidade**: espaços (canais) com posts, comentários, curtidas e posts fixados. O espaço "Avisos" é só para a equipe publicar.
- **Eventos**: lives e encontros com confirmação de presença, link da sala e botão "Adicionar à agenda".
- **Painel admin**: cursos, módulos, aulas, alunos, liberação e remoção de acesso, solicitações, eventos, espaços da comunidade e log dos webhooks.
- **E-mails automáticos (Resend)**: boas-vindas com link para criar a senha, aviso de novo curso liberado e redefinição de senha.
- Funciona no celular, com menu inferior, e no computador.

**Stack:** Next.js 15 · Supabase (banco + login) · Resend (e-mails) · Appmax (checkout) · Vercel (hospedagem)

---

## Fluxos

```
COMPRA (curso pago)
pessoa compra na Appmax → webhook → sistema acha o curso pelo ID/SKU do produto
  → aluno novo?    cria a conta e envia o e-mail "Criar minha senha"
  → já é aluno?    libera o curso e envia o e-mail "Novo conteúdo liberado"
reembolso/chargeback → remove o acesso daquela compra

CURSO GRATUITO (liberado pelo admin)
aluno vê o curso → "Solicitar acesso gratuito" → admin aprova em Admin › Solicitações
  → curso liberado + e-mail
ou: Admin › Alunos & acessos › digita o e-mail → marca os cursos → Liberar
  (se a pessoa não tiver conta, ela é criada e recebe o e-mail para criar a senha)
```

---

## Instalação passo a passo

### 1. Supabase (banco de dados e login)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. O script pode ser rodado de novo sem problemas.
3. Em **Authentication › Sign In / Providers**:
   - desative **Allow new users to sign up**. Só entra quem comprou ou foi liberado por você.
   - em **Email**, aumente o **Email OTP Expiration** para `86400` (24 h), que é a validade do link de criar a senha.
4. Em **Authentication › URL Configuration**, coloque seu domínio em **Site URL** (ex.: `https://membros.seudominio.com.br`).
5. Em **Project Settings › API**, copie a `URL`, a `anon key` e a `service_role key`.

### 2. Resend (e-mails)

1. Crie a conta em [resend.com](https://resend.com) e **verifique seu domínio** (Domains).
2. Crie uma API Key.
3. O remetente (`EMAIL_FROM`) precisa ser desse domínio, por exemplo `Minha Escola <acesso@seudominio.com.br>`.

### 3. Rodar no seu computador (opcional)

```bash
cd area-de-membros
cp .env.example .env.local   # preencha os valores
npm install
npm run dev                  # http://localhost:3000
```

### 4. Primeiro acesso como administrador(a)

1. No Supabase, vá em **Authentication › Users › Add user › Send invitation** (ou *Create new user* com senha) usando seu e-mail.
2. No **SQL Editor**, rode:
   ```sql
   update public.profiles set role = 'admin' where email = 'seu@email.com';
   ```
3. Entre no site e o menu **Admin** vai aparecer.

### 5. Deploy na Vercel

1. Em [vercel.com](https://vercel.com), clique em **Add New › Project** e importe este repositório do GitHub.
2. Em **Root Directory**, escolha **`area-de-membros`**.
3. Em **Environment Variables**, cadastre todas as variáveis do `.env.example`, com `NEXT_PUBLIC_SITE_URL` igual ao seu domínio.
4. Clique em Deploy e depois conecte seu domínio em **Settings › Domains**.

### 6. Appmax (checkout e webhook)

1. Na Appmax, cadastre um webhook com a URL abaixo, marcando os eventos de pedido pago/aprovado e de reembolso/chargeback:
   ```
   https://SEU_DOMINIO/api/webhooks/appmax?token=VALOR_DE_APPMAX_WEBHOOK_SECRET
   ```
2. No painel **Admin › Cursos**, em cada curso pago, preencha:
   - **Link do checkout**: é para onde vai o botão "Quero este curso" do curso bloqueado.
   - **ID(s)/SKU(s) do produto na Appmax**: é assim que o sistema sabe qual curso liberar. Um mesmo ID pode estar em vários cursos, o que serve para um **pacote completo** que libera tudo.
3. Faça uma compra de teste e confira em **Admin › Webhooks**. Cada aviso recebido aparece ali com status (`processed`, `ignored`, `error`) e o conteúdo completo. Se aparecer *"Nenhum curso vinculado aos produtos: X"*, basta copiar o `X` para o campo de IDs do curso.

Eventos que liberam acesso: `OrderApproved`, `OrderPaid`, `OrderPaidByPix`, `OrderPaidByBillet`, `OrderIntegrated`.
Eventos que removem acesso: `OrderRefund`, `OrderChargeBack`.
Para mudar essas listas, use as variáveis `APPMAX_GRANT_EVENTS` e `APPMAX_REVOKE_EVENTS`.

---

## Uso do dia a dia (admin)

| Quero... | Onde |
|---|---|
| Criar um curso pago ou gratuito | Admin › Cursos › Novo curso (escolha "Pago" ou "Gratuito") |
| Adicionar módulos e aulas | Admin › Cursos › (curso) › + Módulo / + Aula |
| Liberar um curso para alguém | Admin › Alunos & acessos › Liberar acesso |
| Aprovar pedidos de curso gratuito | Admin › Solicitações |
| Remover o acesso de um aluno | Admin › Alunos & acessos › (aluno) › Remover |
| Criar uma live ou um encontro | Admin › Eventos › Novo evento |
| Criar ou renomear canais da comunidade | Admin › Comunidade |
| Fixar ou excluir posts | Direto no post, na Comunidade |
| Tornar alguém admin | Admin › Alunos › (aluno) › Tornar admin |

**Vídeos:** cole o link do YouTube (não listado), do Vimeo ou o link de *embed* do Panda Video ou do Bunny Stream. Para conteúdo pago, prefira Panda, Bunny ou Vimeo com restrição de domínio.

---

## Estrutura

```
supabase/schema.sql            tabelas, regras de segurança (RLS) e dados iniciais
src/app/(auth)/                login, esqueci a senha
src/app/definir-senha/         criação de senha (link do e-mail)
src/app/auth/confirm/          valida o link do e-mail
src/app/(membros)/             dashboard, cursos, aulas, comunidade, eventos, perfil
src/app/admin/                 painel administrativo
src/app/api/webhooks/appmax/   recebe as vendas da Appmax
src/lib/access.ts              libera/remove acesso, cria a conta e manda o e-mail
src/lib/appmax.ts              lê o payload da Appmax
src/lib/email.ts               templates de e-mail (Resend)
```

## Segurança

- Todas as tabelas usam **Row Level Security**. O aluno só lê as aulas dos cursos liberados para ele, mesmo que tente acessar o banco direto.
- O aluno não consegue se promover a admin, liberar cursos para si mesmo, fixar posts nem publicar em espaços da equipe.
- Na comunidade, os alunos veem nome e foto dos outros membros, mas **não o e-mail**.
- A `SUPABASE_SERVICE_ROLE_KEY` fica só no servidor (webhook e convites). Nunca a coloque em variáveis `NEXT_PUBLIC_`.
- O webhook exige o token secreto. Avisos repetidos do mesmo pedido são ignorados.
