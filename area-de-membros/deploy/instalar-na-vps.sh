#!/usr/bin/env bash
# Academia Foco (universidade corporativa) — instalação na VPS.
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
# Academia Foco — configuração (só nesta VPS; não versionar). Valores entre aspas.
DATABASE_URL='$DBURL'
SETUP_KEY="$CHAVE_NOVA"
NEXT_PUBLIC_SITE_URL="https://$DOMINIO"
NEXT_PUBLIC_SITE_NAME="Academia Foco"
NEXT_PUBLIC_COMPANY_NAME="Foco Dedetizadora"
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
  echo "     $ENVF já existe — mantido (só o endereço foi conferido)"
fi
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
echo "Links de convite (enquanto o Resend não estiver configurado):  journalctl -u $SERVICO | grep link"
echo "Conferir:   systemctl status $SERVICO   ·   journalctl -u $SERVICO -f"
echo "Voltar à versão anterior:  sudo rm -rf $BASE/app && sudo mv $BASE/app.anterior $BASE/app && sudo systemctl restart $SERVICO"
