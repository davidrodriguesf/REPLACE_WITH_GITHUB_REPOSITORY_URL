# Academia PestX

Universidade corporativa que faz parte do **SaaS PestX ERP**. Cada empresa cliente do PestX tem a sua Academia
(cursos, trilhas, comunidade e certificados só dela), entra com o **mesmo login do PestX** e pode comprar cursos
prontos no **marketplace** do PestX para a equipe.

App de desenvolvimento dos colaboradores: **trilhas por função, cursos, quiz, prova online, certificados, PDI (plano de desenvolvimento individual), agenda de eventos, biblioteca e comunidade**. Funciona no celular, com menu inferior e visual de aplicativo, e no computador.

**Stack:** Next.js 15 · Neon (banco Postgres) · login do PestX (Supabase do PestX, só leitura) · Asaas (pagamentos) · Resend (e-mails) · VPS (nginx)

## Multi-empresa (SaaS PestX)
- **Login:** e-mail e senha do PestX. No login, a Academia lê do PestX (somente leitura, com o token da própria pessoa)
  o colaborador (`usuarios_empresa`), o tipo de acesso (`usuarios_app`) e a empresa (`empresas`). Nada é gravado no PestX.
- **Empresa = `empresas.id` do PestX.** Todas as tabelas da Academia têm `company_id`, e o RLS do banco isola as empresas.
- **Papéis:** acesso "Total" no PestX (ou `admin_empresa`) → administrador da empresa na Academia. `super_admin` → também
  administra o marketplace. A função do PestX (`funcoes_exercidas`) vira a função na Academia (e define a trilha).
- **Quem não tem login no PestX** pode ser convidado por e-mail pela própria Academia (senha própria).
- **Marketplace:** o super admin do PestX cria cursos com preço; o admin da empresa compra em *Painel › Marketplace*,
  paga no Asaas (Pix, boleto ou cartão) e o curso é liberado sozinho para a equipe quando o webhook confirma.
- **Certificado com a marca da empresa:** nome, logo, cor, CNPJ e a assinatura do **responsável legal** (do PestX ou enviada
  em *Painel › Empresa e certificado*).
- **Arquivos:** capa, apostila/PDF, material da aula, foto do mentor, logo e assinatura são enviados pelo formulário
  (ficam na VPS, em `UPLOAD_DIR`). Só os vídeos continuam por link (YouTube, Vimeo, Panda, Bunny...).
- **Atualização do banco:** ao iniciar, o app aplica `database/schema.sql` sozinho quando ele muda (o arquivo é idempotente).
  Instalações antigas (uma empresa só) têm os dados passados para a primeira empresa que entrar.

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

## Regras de acesso
- Cada colaborador tem uma **função** (ex.: Vendedor). A função define a **trilha**.
- Um curso fica visível para a pessoa se for "para todos", se for da função dela, se estiver na trilha dela ou se tiver sido atribuído a ela.
- O **certificado** é emitido sozinho quando a pessoa conclui todas as aulas e, se o curso tiver prova final, é aprovada nela.
- O **gabarito nunca vai para o navegador**: a correção acontece no banco, então não dá para trapacear olhando o código da página.

## Instalação

### 1. Banco de dados (Neon)
1. No [Neon](https://console.neon.tech), abra o projeto, vá em **Connect** e ligue **Connection pooling**.
2. Copie a *connection string* (o endereço tem `-pooler`). Ela vai na variável `DATABASE_URL`.
3. Não precisa rodar SQL à mão: a página `/primeiro-acesso` cria as tabelas sozinha na primeira vez. Se preferir fazer manualmente, cole [`database/schema.sql`](database/schema.sql) no **SQL Editor** do Neon.

> Por segurança, se a senha do banco já apareceu em algum print ou mensagem, clique em **Reset password** no Neon e use a nova string.

### 2. E-mails (Resend)
Crie a conta em [resend.com](https://resend.com), verifique o domínio da empresa e gere uma API Key. Sem ela, o app funciona, mas os links de convite e de senha aparecem só no log do servidor.

### 3. Hospedagem

**Na VPS (recomendado, igual aos outros projetos PestX):** siga [`INSTALAR-NA-VPS.md`](INSTALAR-NA-VPS.md).

**Alternativa, no Netlify:**
1. Em [netlify.com](https://netlify.com), clique em **Add new site › Import from Git** e escolha este repositório.
2. Em **Base directory**, coloque `area-de-membros`. O Netlify detecta o Next.js sozinho.
3. Em **Site configuration › Environment variables**, cadastre as variáveis do [`.env.example`](.env.example). As obrigatórias são `DATABASE_URL`, `SETUP_KEY`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY` e `EMAIL_FROM`.
4. Faça o deploy e, se quiser, conecte um domínio próprio, como `academia.suaempresa.com.br`.

### 4. Primeiro acesso (admin)
1. Abra `https://SEU-SITE/primeiro-acesso`.
2. **Passo 1:** informe a chave `SETUP_KEY` e clique em **Preparar banco de dados**.
3. **Passo 2:** crie a conta de administrador(a). Essa tela só funciona enquanto não existir nenhum admin.
4. No menu (⋯), entre em **Painel administrativo**.

Ordem sugerida: **Funções → Categorias e mentores → Cursos (aulas e prova) → Trilhas → Colaboradores (convites)**.

### Como o login funciona
- As senhas são guardadas com **scrypt**, nunca em texto.
- A sessão fica num cookie seguro e dura 30 dias. Trocar a senha encerra as outras sessões.
- Convites valem 7 dias e o link de redefinição de senha vale 2 horas. Os dois são de **uso único**.
- A cada consulta, o app se identifica no banco como o colaborador logado. As regras de acesso (RLS) do `schema.sql` decidem o que cada pessoa vê, e o gestor só enxerga a própria equipe.

### Rodar localmente
```bash
cd area-de-membros
cp .env.example .env.local   # preencha DATABASE_URL e SETUP_KEY
npm install
npm run dev
```

## Personalizar
- **Nome, logo, cor e assinatura do certificado**: cada empresa ajusta em *Painel › Empresa e certificado*.
- **Cores** (padrão: roxo da PestX): em `src/app/globals.css`, troque a escala `--color-brand-*`.
- **Capas**: use imagens 16:9 para os cursos e 2:3 para a biblioteca. Sem imagem, o app gera uma capa tipográfica.

## Estrutura
```
database/schema.sql              banco, login, regras de acesso (RLS), correção de provas e certificados
src/lib/db/                      conexão com o Neon, consultas e login (sessões, convites, senhas)
src/app/primeiro-acesso/         criação do primeiro administrador
src/app/(app)/                   telas do colaborador (início, catálogo, cursos, trilhas, agenda...)
src/app/(app)/equipe/            visão do gestor
src/app/admin/                   painel do RH
src/app/certificados/[id]        certificado para imprimir ou salvar em PDF
src/app/certificado/[code]       verificação pública do certificado
src/lib/learning.ts              progresso, trilhas e próximos passos
src/lib/reports.ts               relatórios (função learning_report do banco)
```
