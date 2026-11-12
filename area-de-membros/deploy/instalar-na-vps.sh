#!/usr/bin/env bash
# Academia PestX (universidade corporativa do PestX ERP, multi-empresa) — instalação na VPS.
#
#   sudo bash instalar-na-vps.sh academia.pestx.com.br
#
# O que faz:
#   1. confere nginx ativo e se o domínio aponta para esta VPS (não instala servidor web novo);
#   2. usa um Node.js próprio em /opt/academia/node (NÃO mexe no Node do sistema nem no n8n);
#   3. baixa o código do GitHub e compila (com swap temporário se faltar memória);
#   4. cria /opt/academia/academia.env com DATABASE_URL (Neon) e a SETUP_KEY;
#   5. sobe o app como serviço (systemd), com usuário próprio "academia", reiniciando sozinho;
#   6. acrescenta o site no nginx, validando antes de recarregar, e pede o HTTPS ao certbot.
# NÃO mexe no que já está no ar (rastreio, mapa, técnico, n8n, Hermes, painel-consulta).
# Rodar de novo é seguro: atualiza o código e mantém configuração, chave e HTTPS.
# Versão anterior fica em /opt/academia/app.anterior (para voltar: veja o final).
#
# Pode ser baixado sozinho (os modelos de nginx e serviço vêm junto com o código):
#   curl -fsSL https://raw.githubusercontent.com/davidrodriguesf/REPLACE_WITH_GITHUB_REPOSITORY_URL/claude/members-community-area-265h9e/area-de-membros/deploy/instalar-na-vps.sh -o instalar-academia.sh
#   sudo bash instalar-academia.sh academia.pestx.com.br

set -euo pipefail

DOMINIO="${1:-}"
BASE=/opt/academia
SERVICO=academia
USUARIO=academia
REPO="${ACADEMIA_REPO:-https://github.com/davidrodriguesf/REPLACE_WITH_GITHUB_REPOSITORY_URL.git}"
BRANCH="${ACADEMIA_BRANCH:-claude/members-community-area-265h9e}"
NODE_VERSAO=v22.20.0   # 22.12+ é necessário (Tailwind 4 usa require de módulos ESM)

if [[ -z "$DOMINIO" ]]; then
  echo "Falta o domínio.  Uso: sudo bash instalar-na-vps.sh academia.pestx.com.br" >&2
  exit 1
fi
if [[ $EUID -ne 0 ]]; then echo "Rode com sudo." >&2; exit 1; fi
ENVF="$BASE/academia.env"

# ------------------------------------------------------------ configurar o envio de e-mails (Resend)
#   sudo bash instalar-na-vps.sh academia.pestx.com.br --configurar-email
if [[ "${2:-}" == "--configurar-email" ]]; then
  [[ -f "$ENVF" ]] || { echo "Ainda não instalado. Rode primeiro sem --configurar-email." >&2; exit 1; }
  echo "Cole a API key do Resend quando aparecer 'RESEND_API_KEY:' e tecle Enter (ela não aparece na tela)."
  read -r -s -p "RESEND_API_KEY: " RKEY
  echo ""
  RKEY="$(printf '%s' "$RKEY" | tr -d '\r[:space:]"'"'"'')"
  [[ "$RKEY" == re_* ]] || { echo "Isso não parece uma chave do Resend (começa com re_). Nada foi alterado." >&2; exit 1; }
  read -r -p "Remetente [academia@envio.pestx.com.br]: " REMET
  REMET="${REMET:-academia@envio.pestx.com.br}"
  [[ "$REMET" == *@*.* ]] || { echo "Remetente inválido. Nada foi alterado." >&2; exit 1; }
  NOME="$(grep '^NEXT_PUBLIC_SITE_NAME=' "$ENVF" | cut -d= -f2- | tr -d '"')"
  grep -v -e '^RESEND_API_KEY=' -e '^EMAIL_FROM=' "$ENVF" > "$ENVF.novo"
  printf 'RESEND_API_KEY="%s"\nEMAIL_FROM="%s <%s>"\n' "$RKEY" "${NOME:-Academia}" "$REMET" >> "$ENVF.novo"
  chown root:"$USUARIO" "$ENVF.novo"; chmod 640 "$ENVF.novo"; mv "$ENVF.novo" "$ENVF"
  systemctl restart "$SERVICO"
  echo "E-mail configurado: os convites agora saem de \"${NOME:-Academia} <$REMET>\"."
  echo "Teste: convide alguém no painel e confira a caixa de entrada (e o spam)."
  echo "Se não chegar:  journalctl -u $SERVICO -n 30 --no-pager | grep -i email"
  exit 0
fi

# ------------------------------------------------------------ pagamento do marketplace (Asaas)
#   sudo bash instalar-na-vps.sh academia.pestx.com.br --configurar-asaas
if [[ "${2:-}" == "--configurar-asaas" ]]; then
  [[ -f "$ENVF" ]] || { echo "Ainda não instalado. Rode primeiro sem --configurar-asaas." >&2; exit 1; }
  echo "No Asaas: Integrações > Chaves de API > Gerar chave. Cole quando aparecer 'ASAAS_API_KEY:' (não aparece na tela)."
  read -r -s -p "ASAAS_API_KEY: " AKEY
  echo ""
  AKEY="$(printf '%s' "$AKEY" | tr -d '\r[:space:]"'"'"'')"
  [[ "$AKEY" == *aact_* ]] || { echo "Isso não parece uma chave do Asaas (tem 'aact_'). Nada foi alterado." >&2; exit 1; }
  AENV=production
  [[ "$AKEY" == *hmlg* ]] && AENV=sandbox
  TOKEN="$(grep '^ASAAS_WEBHOOK_TOKEN=' "$ENVF" | cut -d= -f2- | tr -d '"')"
  [[ ${#TOKEN} -ge 16 ]] || TOKEN="$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)"
  grep -v -e '^ASAAS_API_KEY=' -e '^ASAAS_ENV=' -e '^ASAAS_WEBHOOK_TOKEN=' "$ENVF" > "$ENVF.novo"
  printf "ASAAS_API_KEY='%s'\nASAAS_ENV=\"%s\"\nASAAS_WEBHOOK_TOKEN=\"%s\"\n" "$AKEY" "$AENV" "$TOKEN" >> "$ENVF.novo"
  chown root:"$USUARIO" "$ENVF.novo"; chmod 640 "$ENVF.novo"; mv "$ENVF.novo" "$ENVF"
  systemctl restart "$SERVICO"
  echo "Asaas configurado ($AENV)."
  echo ""
  echo "Falta 1 passo no Asaas: Integrações > Webhooks > Adicionar"
  echo "  URL:                     https://$DOMINIO/api/asaas/webhook"
  echo "  Token de autenticação:   $TOKEN"
  echo "  Eventos:                 Cobranças (todos)  ·  Fila de sincronização: ligada"
  exit 0
fi

# ------------------------------------------------------------ login do PestX (chave pública do Supabase do PestX)
#   sudo bash instalar-na-vps.sh academia.pestx.com.br --configurar-pestx
if [[ "${2:-}" == "--configurar-pestx" ]]; then
  [[ -f "$ENVF" ]] || { echo "Ainda não instalado. Rode primeiro sem --configurar-pestx." >&2; exit 1; }
  echo "Cole a chave pública (anon) do Supabase do PestX — a mesma do app do técnico (src/config.js, SUPABASE_ANON_KEY)."
  read -r -p "PESTX_SUPABASE_ANON_KEY: " PKEY
  PKEY="$(printf '%s' "$PKEY" | tr -d '\r[:space:]"'"'"'')"
  [[ "$PKEY" == eyJ* ]] || { echo "Isso não parece a chave anon (começa com eyJ). Nada foi alterado." >&2; exit 1; }
  grep -v '^PESTX_SUPABASE_ANON_KEY=' "$ENVF" > "$ENVF.novo"
  printf 'PESTX_SUPABASE_ANON_KEY="%s"\n' "$PKEY" >> "$ENVF.novo"
  chown root:"$USUARIO" "$ENVF.novo"; chmod 640 "$ENVF.novo"; mv "$ENVF.novo" "$ENVF"
  systemctl restart "$SERVICO"
  echo "Login do PestX ligado. Entre em https://$DOMINIO/login com o e-mail e senha do PestX."
  exit 0
fi

# ------------------------------------------------------------ trocar só a senha/endereço do banco
#   sudo bash instalar-na-vps.sh academia.pestx.com.br --trocar-banco
if [[ "${2:-}" == "--trocar-banco" ]]; then
  [[ -f "$ENVF" ]] || { echo "Ainda não instalado. Rode primeiro sem --trocar-banco." >&2; exit 1; }
  echo "Cole a NOVA connection string do Neon quando aparecer 'DATABASE_URL:' e tecle Enter."
  echo "(ela não aparece na tela enquanto você cola)"
  read -r -s -p "DATABASE_URL: " DBURL
  echo ""
  DBURL="$(printf '%s' "$DBURL" | tr -d '\r' | sed "s/^[[:space:]]*psql[[:space:]]*//; s/^[[:space:]'\"]*//; s/[[:space:]'\"]*$//")"
  [[ "$DBURL" == postgres* ]] || { echo "Isso não parece uma connection string (deve começar com postgresql://). Nada foi alterado." >&2; exit 1; }
  cp -p "$ENVF" "$ENVF.anterior"
  grep -v '^DATABASE_URL=' "$ENVF.anterior" > "$ENVF.novo"
  printf "DATABASE_URL='%s'\n" "$DBURL" >> "$ENVF.novo"
  chown root:"$USUARIO" "$ENVF.novo"; chmod 640 "$ENVF.novo"; mv "$ENVF.novo" "$ENVF"
  systemctl restart "$SERVICO"
  PORTA="$(grep '^PORT=' "$ENVF" | cut -d= -f2 | tr -d '"')"
  for i in $(seq 1 20); do
    sleep 1
    CODIGO="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORTA/primeiro-acesso" || true)"
    [[ "$CODIGO" == "200" ]] && break
  done
  if [[ "$CODIGO" == "200" ]]; then
    rm -f "$ENVF.anterior"
    echo "Banco trocado e testado: o app conectou no Neon (primeiro-acesso respondeu 200)."
  else
    echo "O app não conseguiu usar a nova string (HTTP ${CODIGO:-sem resposta}). Voltando para a anterior." >&2
    journalctl -u "$SERVICO" -n 15 --no-pager >&2 || true
    mv "$ENVF.anterior" "$ENVF"; systemctl restart "$SERVICO"; exit 1
  fi
  exit 0
fi

# ------------------------------------------------------------ 1. diagnóstico
echo "==> 1/8  Conferindo a VPS"
systemctl is-active --quiet nginx || { echo "O nginx não está ativo. Não vou instalar servidor web por conta própria." >&2; exit 1; }
command -v git >/dev/null || { echo "git não encontrado. Instale com: apt-get install -y git" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl não encontrado. Instale com: apt-get install -y curl" >&2; exit 1; }
IP_VPS="$(curl -s4 --max-time 5 https://api.ipify.org || true)"
IP_DNS="$(getent ahostsv4 "$DOMINIO" | awk 'NR==1{print $1}' || true)"
echo "     nginx ativo · VPS ${IP_VPS:-?} · $DOMINIO aponta para ${IP_DNS:-nada}"
id -u "$USUARIO" >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin -d "$BASE" "$USUARIO"
mkdir -p "$BASE"

# ------------------------------------------------------------ 2. Node.js próprio
echo "==> 2/8  Node.js próprio em $BASE/node"
case "$(uname -m)" in
  x86_64) ARQ=x64 ;;
  aarch64|arm64) ARQ=arm64 ;;
  *) echo "Arquitetura $(uname -m) não suportada." >&2; exit 1 ;;
esac
if [[ "$("$BASE/node/bin/node" -v 2>/dev/null || true)" != "$NODE_VERSAO" ]]; then
  TMPN="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSAO/node-$NODE_VERSAO-linux-$ARQ.tar.xz" -o "$TMPN/node.tar.xz"
  tar -xJf "$TMPN/node.tar.xz" -C "$TMPN"
  rm -rf "$BASE/node"
  mv "$TMPN/node-$NODE_VERSAO-linux-$ARQ" "$BASE/node"
  rm -rf "$TMPN"
fi
export PATH="$BASE/node/bin:$PATH"
echo "     node $(node -v) · npm $(npm -v) (o Node do sistema não foi alterado)"

# ------------------------------------------------------------ 3. configuração
echo "==> 3/8  Configuração ($ENVF)"
CHAVE_NOVA=""
if [[ ! -f "$ENVF" ]]; then
  echo ""
  echo "     Cole a connection string do Neon (Connect → Connection pooling ligado, endereço com -pooler)."
  echo "     Ela não aparece na tela enquanto você cola. Depois tecle Enter."
  read -r -s -p "     DATABASE_URL: " DBURL
  echo ""
  DBURL="$(printf '%s' "$DBURL" | tr -d '\r' | sed "s/^[[:space:]]*psql[[:space:]]*//; s/^[[:space:]'\"]*//; s/[[:space:]'\"]*$//")"
  [[ "$DBURL" == postgres* ]] || { echo "Isso não parece uma connection string do Neon (deve começar com postgresql://)." >&2; exit 1; }
  CHAVE_NOVA="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
  umask 077
  cat > "$ENVF" <<EOF
# Academia PestX — configuração (só nesta VPS; não versionar). Valores entre aspas.
DATABASE_URL='$DBURL'
SETUP_KEY="$CHAVE_NOVA"
NEXT_PUBLIC_SITE_URL="https://$DOMINIO"
NEXT_PUBLIC_SITE_NAME="Academia PestX"
NEXT_PUBLIC_COMPANY_NAME="PestX"
NEXT_PUBLIC_LOGO_URL=""
NEXT_PUBLIC_SUPPORT_URL=""
NEXT_PUBLIC_CERT_SIGNER=""
NEXT_PUBLIC_CERT_SIGNER_TITLE=""
# E-mails (Resend). Sem a chave, os links de convite aparecem em: journalctl -u academia
RESEND_API_KEY=""
EMAIL_FROM=""
EOF
  umask 022
else
  sed -i "s#^NEXT_PUBLIC_SITE_URL=.*#NEXT_PUBLIC_SITE_URL=\"https://$DOMINIO\"#" "$ENVF"
  # nome novo: Academia Foco → Academia PestX
  sed -i 's#^NEXT_PUBLIC_SITE_NAME="Academia Foco"#NEXT_PUBLIC_SITE_NAME="Academia PestX"#' "$ENVF"
  echo "     $ENVF já existe — mantido (só o endereço foi conferido)"
fi
# Arquivos enviados (capas, PDFs, fotos, assinaturas) e integrações do PestX/Asaas
grep -q '^UPLOAD_DIR=' "$ENVF" || printf 'UPLOAD_DIR="%s"\n' "$BASE/arquivos" >> "$ENVF"
grep -q '^PESTX_SUPABASE_URL=' "$ENVF" || printf 'PESTX_SUPABASE_URL="https://whtpqghzjqshtnraedat.supabase.co"\n' >> "$ENVF"
grep -q '^ASAAS_WEBHOOK_TOKEN=' "$ENVF" || printf 'ASAAS_WEBHOOK_TOKEN="%s"\n' "$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)" >> "$ENVF"
if ! grep -q '^PESTX_SUPABASE_ANON_KEY="eyJ' "$ENVF"; then
  # a chave anon é pública (vai no navegador do app do técnico, publicado nesta mesma VPS): procura nos arquivos dele
  ANON="$(node -e '
    const fs = require("fs"), path = require("path");
    const re = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
    const walk = (d, n = 0) => { if (n > 6) return []; let out = [];
      for (const e of (() => { try { return fs.readdirSync(d, { withFileTypes: true }); } catch { return []; } })()) {
        const p = path.join(d, e.name);
        if (e.isDirectory() && !["node_modules", ".git"].includes(e.name)) out = out.concat(walk(p, n + 1));
        else if (/\.(js|mjs|html)$/.test(e.name)) out.push(p); }
      return out; };
    for (const f of [...walk("/root/tecnico-app"), ...walk("/var/www")]) {
      let t = ""; try { t = fs.readFileSync(f, "utf8"); } catch { continue; }
      for (const m of t.match(re) || []) { try { const p = JSON.parse(Buffer.from(m.split(".")[1], "base64url"));
        if (p.ref === "whtpqghzjqshtnraedat" && p.role === "anon") { console.log(m); process.exit(0); } } catch {} } }' 2>/dev/null || true)"
  if [[ -n "$ANON" ]]; then
    sed -i '/^PESTX_SUPABASE_ANON_KEY=/d' "$ENVF"; printf 'PESTX_SUPABASE_ANON_KEY="%s"\n' "$ANON" >> "$ENVF"
    echo "     login do PestX ligado (chave pública encontrada no app do técnico)"
  else
    echo "     ATENÇÃO: chave pública do PestX não encontrada. Ligue o login do PestX com:" >&2
    echo "       sudo bash $0 $DOMINIO --configurar-pestx" >&2
  fi
fi
mkdir -p "$BASE/arquivos"; chown "$USUARIO:$USUARIO" "$BASE/arquivos"; chmod 750 "$BASE/arquivos"
grep -q '^PORT=' "$ENVF" || {
  PORTA=""
  for p in $(seq 8840 8870); do
    if ! ss -ltnH "sport = :$p" | grep -q .; then PORTA=$p; break; fi
  done
  [[ -n "$PORTA" ]] || { echo "Nenhuma porta livre entre 8840 e 8870." >&2; exit 1; }
  printf 'PORT="%s"\nHOSTNAME="127.0.0.1"\n' "$PORTA" >> "$ENVF"
}
PORTA="$(grep '^PORT=' "$ENVF" | cut -d= -f2 | tr -d '"')"
chown root:"$USUARIO" "$ENVF"; chmod 640 "$ENVF"
echo "     porta $PORTA (só dentro da VPS; quem fala com a internet é o nginx)"

# ------------------------------------------------------------ 4. código
echo "==> 4/8  Baixando o código ($BRANCH)"
if [[ -d "$BASE/src/.git" ]]; then
  git -C "$BASE/src" fetch --depth 1 origin "$BRANCH"
  git -C "$BASE/src" reset --hard FETCH_HEAD
else
  rm -rf "$BASE/src"
  git clone --depth 1 -b "$BRANCH" "$REPO" "$BASE/src"
fi
APP_SRC="$BASE/src/area-de-membros"
TPL="$APP_SRC/deploy"   # modelos de nginx e systemd (sempre da versão baixada)
echo "     versão $(git -C "$BASE/src" rev-parse --short HEAD)"

# ------------------------------------------------------------ 5. compilação
echo "==> 5/8  Compilando (pode levar alguns minutos)"
SWAP_TMP=""
MEM_MB=$(awk '/MemAvailable/{m=$2} /SwapFree/{s=$2} END{print int((m+s)/1024)}' /proc/meminfo)
if (( MEM_MB < 1800 )); then
  SWAP_TMP=/swapfile-academia-build
  echo "     pouca memória livre (${MEM_MB} MB): criando swap temporário de 2 GB"
  fallocate -l 2G "$SWAP_TMP" 2>/dev/null || dd if=/dev/zero of="$SWAP_TMP" bs=1M count=2048 status=none
  chmod 600 "$SWAP_TMP"; mkswap "$SWAP_TMP" >/dev/null; swapon "$SWAP_TMP"
fi
limpar_swap() { if [[ -n "$SWAP_TMP" ]]; then swapoff "$SWAP_TMP" 2>/dev/null || true; rm -f "$SWAP_TMP"; fi; }
trap limpar_swap EXIT
(
  cd "$APP_SRC"
  set -a; source "$ENVF"; set +a
  export NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536
  npm ci --no-audit --no-fund --loglevel=error --include=dev
  npm run build
)
limpar_swap; SWAP_TMP=""
[[ -f "$APP_SRC/.next/standalone/server.js" ]] || { echo "A compilação não gerou o servidor (.next/standalone/server.js)." >&2; exit 1; }

# ------------------------------------------------------------ 6. instalar e serviço
echo "==> 6/8  Instalando e subindo o serviço"
NOVA="$BASE/app.novo"
rm -rf "$NOVA"
cp -r "$APP_SRC/.next/standalone" "$NOVA"
mkdir -p "$NOVA/.next"
cp -r "$APP_SRC/.next/static" "$NOVA/.next/static"
[[ -d "$APP_SRC/public" ]] && cp -r "$APP_SRC/public" "$NOVA/public"
if [[ -d "$BASE/app" ]]; then rm -rf "$BASE/app.anterior"; mv "$BASE/app" "$BASE/app.anterior"; fi
mv "$NOVA" "$BASE/app"
chown -R root:root "$BASE/app" "$BASE/node"; chmod -R a+rX "$BASE/app" "$BASE/node"
mkdir -p "$BASE/app/.next/cache"; chown -R "$USUARIO:$USUARIO" "$BASE/app/.next/cache"

sed -e "s#__BASE__#$BASE#g" -e "s#__USUARIO__#$USUARIO#g" "$TPL/academia.service" > /etc/systemd/system/$SERVICO.service
systemctl daemon-reload
systemctl enable $SERVICO >/dev/null 2>&1
systemctl restart $SERVICO
CODIGO=""
for i in $(seq 1 20); do
  sleep 1
  CODIGO="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORTA/login" || true)"
  [[ "$CODIGO" == "200" ]] && break
done
if [[ "$CODIGO" != "200" ]]; then
  echo "     o app não respondeu (HTTP ${CODIGO:-sem resposta}). Últimas linhas do log:" >&2
  journalctl -u $SERVICO -n 40 --no-pager >&2 || true
  if [[ -d "$BASE/app.anterior" ]]; then
    echo "     voltando para a versão anterior..." >&2
    rm -rf "$BASE/app"; mv "$BASE/app.anterior" "$BASE/app"; systemctl restart $SERVICO
  fi
  exit 1
fi
echo "     app no ar em 127.0.0.1:$PORTA (login respondeu 200)"
CODIGO_DB="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORTA/primeiro-acesso" || true)"
if [[ "$CODIGO_DB" == "200" ]]; then
  echo "     banco Neon conectado (primeiro-acesso respondeu 200)"
else
  echo "     ATENÇÃO: o app não conseguiu falar com o banco (HTTP $CODIGO_DB)." >&2
  echo "     Troque a string com:  sudo bash $0 $DOMINIO --trocar-banco" >&2
fi

# ------------------------------------------------------------ 7. nginx
echo "==> 7/8  Site no nginx"
if grep -rqs "sites-enabled" /etc/nginx/nginx.conf; then
  ALVO=/etc/nginx/sites-available/$SERVICO; LINK=/etc/nginx/sites-enabled/$SERVICO
  mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
elif grep -rqs "conf\.d/\*\.conf" /etc/nginx/nginx.conf; then
  ALVO=/etc/nginx/conf.d/$SERVICO.conf; LINK=""
else
  echo "     não descobri de onde o nginx lê os sites (veja os include em /etc/nginx/nginx.conf)." >&2; exit 1
fi
if [[ -f "$ALVO" ]]; then
  echo "     $ALVO já existe — mantido (o certbot pode ter acrescentado o HTTPS nele)"
  # envio de arquivos (capas, PDFs): limite de 2 MB da versão antiga → 60 MB
  if grep -q 'client_max_body_size 2m;' "$ALVO"; then
    cp -p "$ALVO" "$ALVO.anterior"
    sed -i 's/client_max_body_size 2m;/client_max_body_size 60m;/; s/proxy_read_timeout 60s;/proxy_read_timeout 120s;/' "$ALVO"
    echo "     limite de envio de arquivos aumentado para 60 MB"
    if ! nginx -t 2>/dev/null; then mv "$ALVO.anterior" "$ALVO"; echo "     nginx -t reclamou; limite antigo mantido" >&2; else rm -f "$ALVO.anterior"; fi
  fi
else
  sed -e "s/__DOMINIO__/$DOMINIO/g" -e "s/__PORTA__/$PORTA/g" "$TPL/nginx-academia.conf" > "$ALVO"
  chmod 644 "$ALVO"
  [[ -n "$LINK" ]] && ln -sfn "$ALVO" "$LINK"
  echo "     site criado em $ALVO"
fi
if ! nginx -t 2>&1; then
  echo "     nginx -t reclamou. NÃO vou recarregar. Desfazendo o site novo." >&2
  if [[ -n "$LINK" ]]; then rm -f "$LINK"; else rm -f "$ALVO"; fi
  exit 1
fi
systemctl reload nginx

# ------------------------------------------------------------ 8. HTTPS
echo "==> 8/8  HTTPS"
if grep -qs "ssl_certificate" "$ALVO"; then
  echo "     HTTPS já configurado."
elif [[ -n "$IP_VPS" && "$IP_DNS" != "$IP_VPS" ]]; then
  echo "     O domínio ainda não aponta para esta VPS (${IP_DNS:-nada} ≠ $IP_VPS)." >&2
  echo "     Crie o registro no Cloudflare (nuvem cinza) e rode de novo." >&2
  exit 1
elif command -v certbot >/dev/null; then
  certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos --redirect || {
    echo "     O certbot não conseguiu. Rode à mão:  sudo certbot --nginx -d $DOMINIO" >&2; exit 1; }
else
  echo "     certbot não encontrado. Instale e rode:  sudo certbot --nginx -d $DOMINIO" >&2; exit 1
fi

echo ""
echo "Pronto:  https://$DOMINIO"
if [[ -n "$CHAVE_NOVA" ]]; then
  echo ""
  echo "PRIMEIRO ACESSO:  https://$DOMINIO/primeiro-acesso"
  echo "  CHAVE DE INSTALAÇÃO (SETUP_KEY):  $CHAVE_NOVA"
  echo "  (guarde agora; ela também fica em $ENVF)"
  echo "  Passo 1: Preparar banco de dados · Passo 2: criar o administrador"
fi
if [[ -z "$CHAVE_NOVA" ]]; then
  echo ""
  echo "Primeiro acesso (se ainda não fez):  https://$DOMINIO/primeiro-acesso"
  echo "  ver a chave:  sudo grep SETUP_KEY $ENVF"
fi
echo ""
echo "Login: o mesmo e-mail e senha do PestX (o administrador do PestX vira administrador aqui)."
grep -q "^ASAAS_API_KEY=" "$ENVF" || echo "Pagamento do marketplace (Asaas): sudo bash $0 $DOMINIO --configurar-asaas"
echo "Links de convite (enquanto o Resend não estiver configurado):  journalctl -u $SERVICO | grep link"
echo "Conferir:   systemctl status $SERVICO   ·   journalctl -u $SERVICO -f"
echo "Voltar à versão anterior:  sudo rm -rf $BASE/app && sudo mv $BASE/app.anterior $BASE/app && sudo systemctl restart $SERVICO"
