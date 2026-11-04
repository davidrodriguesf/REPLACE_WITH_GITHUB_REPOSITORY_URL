# Travel Hacking Toolkit

Este repositório instala o plugin [travel-hacking-toolkit](https://github.com/borski/travel-hacking-toolkit)
(`travel-hacker@borski`) no Claude Code: 42 skills, 6 servidores MCP e o subagente `travel-hacker`
para busca de voos com milhas/pontos, hotéis, saldos de fidelidade e otimização de resgates.

## Como funciona

O arquivo `.claude/settings.json` registra o marketplace `borski` e habilita o plugin.
Ao abrir este repositório no Claude Code (local ou na web), aceite o prompt de confiança e o plugin
será instalado automaticamente.

Instalação manual alternativa, dentro do Claude Code:

```
/plugin marketplace add borski/travel-hacking-toolkit
/plugin install travel-hacker@borski
```

Para verificar: `/travel-hacker:getting-started`.

## Chaves de API

Funciona sem chaves: Skiplagged, Kiwi, Trivago, Ferryhopper e Airbnb.
Para busca de resgates e demais recursos, defina variáveis de ambiente (veja `.env.example`).
As principais:

| Variável | Para quê |
|---|---|
| `SEATS_AERO_API_KEY` | Disponibilidade de resgates em 27 programas de milhas |
| `DUFFEL_API_KEY_LIVE` | Preços de voos em dinheiro (GDS) |
| `IGNAV_API_KEY` | Preços em dinheiro (backup) |
| `AWARDWALLET_API_KEY` / `AWARDWALLET_USER_ID` | Saldos de pontos/milhas |

Localmente, use o script oficial:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/borski/travel-hacking-toolkit/main/scripts/setup-keys.sh)
```

No Claude Code na web, cadastre as chaves como variáveis de ambiente do ambiente de nuvem
(nunca faça commit de um `.env` com valores reais).

---

## Universidade Corporativa

A pasta [`area-de-membros/`](area-de-membros/) contém o app interno de desenvolvimento dos colaboradores:
trilhas por função, cursos, quiz e prova online, certificados, PDI, agenda, biblioteca e comunidade.
Guia completo em [`area-de-membros/README.md`](area-de-membros/README.md). No Netlify, use **Base directory = `area-de-membros`**. Banco de dados: Neon.
