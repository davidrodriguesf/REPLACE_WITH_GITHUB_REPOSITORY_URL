# Academia Foco — instalar na VPS

Vai na mesma VPS do mapa, do rastreio e do app do técnico (**187.77.228.157**, nginx). O instalador
só **acrescenta** um site novo: não mexe no n8n, no Hermes, no mapa, no rastreio, no técnico nem no
painel-consulta. Ele valida o nginx antes de recarregar e, se der erro, desfaz sozinho.

- **Banco:** Neon. O app conecta pela internet, sem banco na VPS.
- **Node.js:** o instalador baixa um Node próprio em `/opt/academia/node`. O Node do sistema não é alterado.
- **Endereço sugerido:** **academia.pestx.com.br**. Pode ser outro; nesse caso, troque em todos os passos.

---

## 1. DNS (no Cloudflare)

| Tipo | Nome | Conteúdo | Proxy |
|---|---|---|---|
| A | `academia` | `187.77.228.157` | **Somente DNS** (nuvem cinza) |

A nuvem cinza é necessária para o certificado HTTPS, igual ao `mapa`, `rastreio` e `tecnico`.

## 2. Pegar a connection string (no Neon)

1. No Neon, abra **Connect** e clique em **Reset password**. A senha antiga apareceu em print.
2. Deixe **Connection pooling** ligado e copie a string. Ela começa com `postgresql://` e tem `-pooler` no endereço.

## 3. Instalar (na VPS)

```bash
ssh root@187.77.228.157
curl -fsSL https://raw.githubusercontent.com/davidrodriguesf/REPLACE_WITH_GITHUB_REPOSITORY_URL/claude/members-community-area-265h9e/area-de-membros/deploy/instalar-na-vps.sh -o instalar-academia.sh
sudo bash instalar-academia.sh academia.pestx.com.br
```

- Na primeira vez, o instalador pede a **DATABASE_URL**: cole a string do passo 2 e tecle Enter. Ela não aparece na tela.
- A compilação leva de 3 a 6 minutos. Se a VPS tiver pouca memória livre, ele cria um swap temporário e apaga no final.
- No final, ele mostra a **CHAVE DE INSTALAÇÃO (SETUP_KEY)**. **Guarde na hora.** Ela também fica em `/opt/academia/academia.env`.
- O HTTPS é pedido ao certbot automaticamente. Se o DNS ainda não estiver propagado, ele avisa: espere uns minutos e rode o mesmo comando de novo.

## 4. Primeiro acesso (no navegador)

1. Abra **https://academia.pestx.com.br/primeiro-acesso**.
2. **Passo 1:** cole a SETUP_KEY e clique em **Preparar banco de dados**. Isso cria as tabelas no Neon.
3. **Passo 2:** crie a sua conta de administrador(a).
4. No menu (⋯), entre em **Painel administrativo**. Ordem sugerida: Funções → Categorias e mentores →
   Cursos (aulas e prova) → Trilhas → Colaboradores (convites).

## 5. E-mails dos convites (depois, opcional)

Enquanto o Resend não estiver configurado, os convites não saem por e-mail. O link de cada convite
aparece no log, e você pode mandar pelo WhatsApp:

```bash
journalctl -u academia | grep link
```

Para ligar o envio por e-mail, edite `/opt/academia/academia.env` e preencha `RESEND_API_KEY` e
`EMAIL_FROM` (ex.: `"Academia Foco <academia@pestx.com.br>"`). O domínio precisa estar verificado no
Resend. Depois rode `sudo systemctl restart academia`.

---

## Conferir se está tudo certo (na VPS)

```bash
systemctl status academia            # tem que estar "active (running)"
journalctl -u academia -f            # log ao vivo (Ctrl+C sai)
curl -I https://academia.pestx.com.br/login   # tem que dar 200
```

## Atualizar depois (quando eu mudar alguma coisa)

```bash
sudo bash instalar-academia.sh academia.pestx.com.br
```

Ele baixa o código novo, compila e troca a versão. Mantém o `academia.env` (banco e chave), o site do nginx,
o HTTPS e todos os dados, que ficam no Neon. A versão anterior fica guardada em `/opt/academia/app.anterior`.

## Mudar nome, assinatura do certificado ou cores

- **Nome e assinatura:** edite as linhas `NEXT_PUBLIC_*` em `/opt/academia/academia.env` e rode o
  instalador de novo. Esses valores entram na compilação, então só reiniciar não basta.
- **Cores:** ficam no código (`src/app/globals.css`); é só me pedir.

## Se algo der errado

| Sintoma | O que fazer |
|---|---|
| `O domínio ainda não aponta para esta VPS` | confira o registro no Cloudflare (nuvem cinza); espere e rode de novo |
| `O certbot não conseguiu` | rode `sudo certbot --nginx -d academia.pestx.com.br` e me mande o print |
| `o app não respondeu` | o instalador mostra o log e **volta sozinho** para a versão anterior; me mande o print |
| `nginx -t reclamou` | nada foi alterado (ele desfez); me mande o print |
| Erro na compilação | me mande as últimas linhas; a versão no ar continua funcionando |
| "Chave de instalação incorreta" | veja a chave com `sudo grep SETUP_KEY /opt/academia/academia.env` |
| Login não funciona em `http://` | é esperado: o login só funciona em **https** (cookie seguro) |

**Voltar à versão anterior:**
```bash
sudo rm -rf /opt/academia/app && sudo mv /opt/academia/app.anterior /opt/academia/app && sudo systemctl restart academia
```

**Parar tudo:** `sudo systemctl disable --now academia`. O site do nginx continua configurado, mas, sem
o serviço, responde erro 502 e não expõe nada. Os dados ficam no Neon.
