# VirtualWeb ERP — Self-Hosting (Ubuntu 24.04 + Docker Compose)

Este diretório contém tudo para rodar o sistema **inteiramente na sua VM**, sem depender da nuvem da Lovable. A stack levanta:

- **PostgreSQL 15** (com extensões usadas pelo Supabase)
- **Supabase Auth (GoTrue)** — autenticação (mesma API que a Lovable usa hoje)
- **PostgREST** — API REST sobre o Postgres (consumida pelo `@supabase/supabase-js`)
- **Supabase Storage** — upload de arquivos (para anexos futuros)
- **Kong** — gateway que expõe tudo na porta `8000` (= "SUPABASE_URL")
- **Supabase Studio** — painel admin web na porta `3001`
- **App TanStack Start (VirtualWeb ERP)** — frontend + server functions, porta `3000`
- **Nginx** (opcional) — reverse proxy, pronto para receber domínio + HTTPS depois

```
┌───────────────────────────── VM Ubuntu 24.04 ─────────────────────────────┐
│                                                                            │
│   Browser LAN ──► nginx:80 ──► app:3000  (TanStack Start, SSR + UI)        │
│                          └──► kong:8000 ──► gotrue / postgrest / storage   │
│                                              └──► postgres:5432            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Pré-requisitos na VM

```bash
sudo apt update && sudo apt install -y ca-certificates curl gnupg git
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# logout/login para o grupo valer
```

## 2. Copiar este diretório para a VM

Do seu micro:
```bash
rsync -av --exclude node_modules ./ usuario@IP_DA_VM:/opt/virtualweb/
```

Ou faça `git clone` do projeto na VM e use somente a pasta `deploy/`.

## 3. Gerar segredos e configurar `.env`

```bash
cd /opt/virtualweb/deploy
cp .env.example .env
# Gere segredos fortes:
openssl rand -hex 32   # use para POSTGRES_PASSWORD
openssl rand -hex 64   # use para JWT_SECRET (mínimo 32 chars)
```

Edite `.env` e preencha:
- `POSTGRES_PASSWORD`
- `JWT_SECRET` (mesmo valor é usado por GoTrue, PostgREST e Storage)
- `ANON_KEY` e `SERVICE_ROLE_KEY` — gere em https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys usando seu `JWT_SECRET`
- `SITE_URL` = `http://IP_DA_VM` (ou `http://IP_DA_VM:3000` se sem nginx)
- `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` para o Studio

## 4. Aplicar o schema do ERP

As migrations da Lovable são copiadas em `db/init/` e rodam automaticamente na primeira subida do Postgres.

Se você já fez alterações depois, copie os arquivos novos:
```bash
cp ../supabase/migrations/*.sql deploy/db/init/
```

## 5. Subir tudo

```bash
docker compose up -d
docker compose ps
docker compose logs -f app
```

Acessos:
- App (ERP): `http://IP_DA_VM` (via nginx) ou `http://IP_DA_VM:3000` (direto)
- Supabase Studio: `http://IP_DA_VM:3001`
- Supabase API: `http://IP_DA_VM:8000`

## 6. Primeiro usuário admin

1. Acesse o app e crie sua conta em `/signup`.
2. No Studio → SQL Editor, rode:
```sql
UPDATE public.user_roles SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'voce@empresa.com');
```

## 7. Backups do banco

Crontab simples:
```cron
0 2 * * * docker exec virtualweb-postgres pg_dump -U postgres postgres | gzip > /opt/virtualweb/backups/db-$(date +\%F).sql.gz
```

## 8. Futuro: domínio + HTTPS

Quando tiver domínio público apontando para a VM:
1. Edite `nginx/default.conf` trocando `server_name _;` por `server_name erp.suaempresa.com.br;`.
2. Rode o helper:
```bash
docker compose --profile certbot run --rm certbot \
  certonly --webroot -w /var/www/certbot -d erp.suaempresa.com.br -m voce@empresa.com --agree-tos
```
3. Descomente o bloco `server { listen 443 ssl; ... }` em `nginx/default.conf`.
4. `docker compose restart nginx`.
5. Atualize `SITE_URL` e `API_EXTERNAL_URL` no `.env` para `https://erp.suaempresa.com.br` e refaça `docker compose up -d`.

---

## Continuando a editar na Lovable

Você continua usando a Lovable normalmente. Quando quiser atualizar a VM:

```bash
# Na VM, dentro de /opt/virtualweb:
git pull                                  # ou rsync novo
cp supabase/migrations/*.sql deploy/db/init/   # se houver migration nova
cd deploy
docker compose build app
docker compose up -d
# Se houver migration nova, aplique manualmente:
for f in db/init/*.sql; do
  docker exec -i virtualweb-postgres psql -U postgres -d postgres < "$f" || true
done
```

> Migrations existentes não são reaplicadas. Para uma estratégia mais robusta no futuro, podemos adicionar uma ferramenta como `dbmate` ou `sqitch`.
