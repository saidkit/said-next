# Local backend — WordPress (dev)

A throwaway WordPress + MariaDB stack for developing the CMS integration
(`web/src/lib/cms/wordpress.ts` + `rank-math.ts`). **Not for production** — production
WordPress is hosted separately; this is just so the WordPress adapter has something to
talk to on your machine.

## Run

```bash
cd server
cp .env.example .env          # tweak creds / port if you like
docker compose up -d          # WordPress at http://localhost:8080
```

Then point the app at it (`web/.env`):

```
CMS_CLIENT=wordpress
WORDPRESS_API_URL=http://localhost:8080
```

`cd web && pnpm dev` — the blog now renders from WordPress instead of MDX, through
the same `CmsClient` contract.

## First-time setup (once)

1. Open <http://localhost:8080> → finish the WordPress install (create an admin user).
2. **Settings → Permalinks → Post name** — pretty permalinks are required for the `wp-json` REST API.
3. **Plugins → Add New → Rank Math SEO** — the adapter reads `/wp-json/rankmath/v1/getHead` for `post.seo` (ADR-NEXT-S07).
4. Publish a post → it appears at the app's `/blog`.

## Teardown

```bash
docker compose down       # stop; keep data
docker compose down -v    # stop + wipe DB and wp-content
```

`wordpress/wp-content/` (uploads, installed plugins) is git-ignored except this dir's `.gitkeep`.
