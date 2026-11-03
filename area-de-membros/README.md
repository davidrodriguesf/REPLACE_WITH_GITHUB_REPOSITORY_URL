# Universidade Corporativa

App interno de desenvolvimento dos colaboradores: **trilhas por função, cursos, quiz, prova online, certificados, PDI (plano de desenvolvimento individual), agenda de eventos, biblioteca e comunidade**. Funciona no celular, com menu inferior e visual de aplicativo, e no computador.

**Stack:** Next.js 15 · Supabase (banco e login) · Resend (e-mails) · Vercel (hospedagem)

## O que tem

### Para o colaborador
- **Início**: a trilha da função com o progresso, os cursos obrigatórios com prazo, "Continuar Estudando", "Conteúdos em Alta" (top 10), recomendados, próximos eventos e fileiras por categoria.
- **Catálogo** com busca e filtro por categoria.
- **Página do curso** em formato de gaveta: módulos, carga horária, sobre o curso, mentores, prova final, certificado e o botão "Acessar"/"Continuar".
- **Aula**: vídeo (YouTube, Vimeo, Panda, Bunny...), material de apoio, quiz da aula, "Concluir e avançar" e o painel de progresso.
- **Quiz e prova online**: uma questão por vez, cronômetro opcional, limite de tentativas, correção no servidor, nota mínima e gabarito com explicação (configurável).
- **Trilhas**: o caminho passo a passo da função.
- **Meu desenvolvimento**: horas estudadas, cursos concluídos, certificados, média nas provas e PDIs com metas e anotações de feedback.
- **Certificados** prontos para baixar em PDF, com código e página pública de verificação.
- **Agenda**: eventos próximos e anteriores, selo "AO VIVO" e confirmação de presença.
- **Biblioteca**: manuais, políticas e e-books.
- **Comunidade**: canais, posts, comentários e curtidas.
- **Perfil**, com informações pessoais e da empresa.

### Para o gestor
- **Minha equipe**: progresso de cada pessoa, cursos atrasados, PDIs e avaliações.
- Cria **PDIs** com metas, atribui **cursos com prazo** e registra feedbacks.
- Só enxerga a própria equipe (garantido pelo banco).

### Para o RH (admin)
- **Colaboradores**: convite por e-mail, função, departamento, gestor, perfil de acesso e desativação.
- **Funções** e **trilhas**: cada função recebe a sua trilha, com cursos em ordem, obrigatórios ou opcionais.
- **Cursos**: módulos, aulas, categoria, mentores, carga horária, público (todos ou funções específicas) e certificado.
- **Editor de quiz e prova**: questões de múltipla escolha, nota mínima, tentativas e tempo.
- **Relatórios**: progresso por colaborador e por curso, atrasados e média das provas, com **exportação em CSV** (abre no Excel).
- Biblioteca, eventos, canais da comunidade, categorias e mentores.

## Como os acessos funcionam
- Cada colaborador tem uma **função** (ex.: Vendedor). A função define a **trilha**.
- Um curso fica visível para a pessoa se for "para todos", se for da função dela, se estiver na trilha dela ou se tiver sido atribuído a ela.
- O **certificado** é emitido sozinho quando a pessoa conclui todas as aulas e, se o curso tiver prova final, é aprovada nela.
- O **gabarito nunca vai para o navegador**: a correção acontece no banco, então não dá para trapacear olhando o código da página.

## Instalação

### 1. Supabase
1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. O script pode ser rodado de novo sem problemas.
3. Em **Authentication › Sign In / Providers**, desative **Allow new users to sign up**. Só entra quem o RH convidar.
4. Em **Authentication › Email**, defina **Email OTP Expiration** como `86400` (24 h), que é a validade do convite.
5. Em **Authentication › URL Configuration**, coloque o domínio do app em **Site URL**.
6. Copie a URL, a `anon key` e a `service_role key` em **Project Settings › API**.

### 2. Resend
Crie a conta, verifique o domínio da empresa e gere uma API Key.

### 3. Primeiro acesso (admin)
1. No Supabase, vá em **Authentication › Users › Add user** e crie o seu usuário.
2. No SQL Editor, rode:
   ```sql
   update public.profiles set role = 'admin' where email = 'seu@email.com';
   ```
3. Entre no app, abra o menu (⋯) e clique em **Painel administrativo**.

Ordem sugerida: **Funções → Categorias e mentores → Cursos (aulas e prova) → Trilhas → Colaboradores (convites)**.

### 4. Deploy na Vercel
1. Importe o repositório e defina o **Root Directory** como `area-de-membros`.
2. Cadastre as variáveis do `.env.example`.
3. Conecte o domínio da empresa.

### Rodar localmente
```bash
cd area-de-membros
cp .env.example .env.local   # preencha
npm install
npm run dev
```

## Personalizar
- **Nome, logo e assinatura do certificado**: variáveis `NEXT_PUBLIC_*` no `.env`.
- **Cores**: em `src/app/globals.css`, troque as escalas `--color-navy-*` (cor principal) e `--color-gold-*` (destaque).
- **Capas**: use imagens 16:9 para os cursos e 2:3 para a biblioteca. Sem imagem, o app gera uma capa tipográfica.

## Estrutura
```
supabase/schema.sql              banco, regras de acesso (RLS), correção de provas e certificados
src/app/(app)/                   telas do colaborador (início, catálogo, cursos, trilhas, agenda...)
src/app/(app)/equipe/            visão do gestor
src/app/admin/                   painel do RH
src/app/certificados/[id]        certificado para imprimir ou salvar em PDF
src/app/certificado/[code]       verificação pública do certificado
src/lib/learning.ts              progresso, trilhas e próximos passos
src/lib/reports.ts               relatórios (função learning_report do banco)
```
