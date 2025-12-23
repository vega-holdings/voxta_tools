# CLAUDE.md - Voxta Unofficial Docs Site

This file provides guidance to Claude Code when working with this project.

## Project Overview

A searchable documentation site for Voxta built with:
- **PayloadCMS** - Headless CMS for content management
- **Next.js 15** - React framework with App Router
- **Cloudflare D1** - SQLite database
- **Cloudflare R2** - Media/file storage
- **Cloudflare Vectorize** - Vector search index (384 dimensions, cosine metric)
- **Cloudflare Workers AI** - Embedding generation (`@cf/baai/bge-small-en-v1.5`)
- **OpenNext** - Adapter for deploying Next.js to Cloudflare

## Content

| Collection | Count | Description |
|------------|-------|-------------|
| docs-pages | 84 | Official documentation + dev guides |
| kb-articles | 1,005 | Community knowledge base articles |

### Doc Categories

Docs are organized by category with sort order:
- `documentation` - Overview, getting started, glossary, terms
- `installing` - Install/update server
- `interface` - UI screens and features
- `creator-studio` - Scenarios, memory books, actions, scripting
- `modules` - Service providers (LLM, TTS, STT, etc.)
- `articles` - Guides, FAQs, dev documentation

## Commands

```bash
# Development
pnpm install
pnpm dev                    # Start dev server at localhost:3000

# Build & Deploy
pnpm build                  # Build for production
pnpm deploy                 # Deploy to Cloudflare Pages

# Database
pnpm payload migrate        # Run Payload migrations on local D1

# Type checking
npx tsc --noEmit           # Check TypeScript without emitting
```

## Project Structure

```
site/
├── src/
│   ├── app/
│   │   ├── (frontend)/           # Public pages
│   │   │   ├── docs/[slug]/      # Doc detail pages
│   │   │   ├── kb/[slug]/        # KB article pages
│   │   │   ├── docs/page.tsx     # Docs list (grouped by category)
│   │   │   ├── kb/page.tsx       # KB list
│   │   │   ├── leaderboard/      # Top contributors page
│   │   │   └── page.tsx          # Homepage with search + quick-links
│   │   ├── (payload)/            # PayloadCMS admin UI
│   │   └── api/
│   │       ├── search/route.ts   # Vector search endpoint
│   │       └── admin/
│   │           └── populate-vectors/route.ts  # Admin: populate Vectorize
│   ├── collections/
│   │   ├── DocsPages.ts          # docs-pages collection schema
│   │   ├── KBArticles.ts         # kb-articles collection schema
│   │   └── Media.ts              # Media uploads
│   ├── components/
│   │   ├── MarkdownContent.tsx   # Markdown renderer with link transformation
│   │   └── SearchForm.tsx        # Search UI component
│   └── payload.config.ts         # Payload configuration
├── wrangler.jsonc                # Cloudflare bindings config
└── populate-vectors.js           # Script to populate Vectorize index
```

## Key Files

### Collections

**DocsPages** (`src/collections/DocsPages.ts`)
- Fields: title, slug, content (textarea), category, sortOrder, originalUrl, relatedKB
- `category`: One of documentation, installing, interface, creator-studio, modules, articles
- `sortOrder`: Number for ordering within category (lower = first)

**KBArticles** (`src/collections/KBArticles.ts`)
- Fields: title, slug, content (textarea), type, category, topics[], keywords[], confidence, contributor

### API Endpoints

**GET /api/search?q=query**
- Generates embedding for query using Workers AI
- Queries Vectorize for similar documents
- Returns top 10 matches with metadata

**POST /api/admin/populate-vectors**
- Protected by `x-admin-secret` header (must match PAYLOAD_SECRET)
- Query params: `collection` (docs|kb|all), `batch` (default 50), `page`
- Generates embeddings and upserts to Vectorize

### Components

**MarkdownContent** (`src/components/MarkdownContent.tsx`)
- Renders markdown with remark-gfm (tables, strikethrough, etc.)
- Transforms `https://doc.voxta.ai/docs/X/` links to local `/docs/X`
- Strips first heading to avoid duplicate titles
- External links open in new tab

## Cloudflare Bindings (wrangler.jsonc)

```jsonc
{
  "d1_databases": [{ "binding": "DB", "database_name": "voxta-docs", "database_id": "..." }],
  "r2_buckets": [{ "binding": "R2", "bucket_name": "voxta-docs" }],
  "vectorize": [{ "binding": "VECTORIZE", "index_name": "voxta-docs-index" }],
  "ai": { "binding": "AI" }
}
```

## Cloudflare Project

- **Project Name**: `voxta-unoffical-docs`
- Use `wrangler secret put <NAME> --name voxta-unoffical-docs` to set secrets

## Environment Variables

- `PAYLOAD_SECRET` - Secret for Payload admin & API auth
- `CLOUDFLARE_API_TOKEN` - For wrangler CLI operations
- `DISCORD_CLIENT_ID` - Discord OAuth app client ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth app client secret
- `NEXT_PUBLIC_APP_URL` - Site URL (https://voxta.axailotl.ai)

## Data Import

### Import Docs (from parent directory markdown files)

```bash
# Generate SQL from docs-*.md files
node clean-import-docs.cjs

# Execute against remote D1
npx cross-env CLOUDFLARE_API_TOKEN=xxx npx wrangler d1 execute voxta-docs --remote --file=clean-import-docs.sql
```

### Import KB Articles (from kb/ directory)

```bash
# Generate batched SQL files from kb/**/*.md
node clean-import-kb.cjs

# Execute each batch (kb has 1000+ articles, needs batching)
npx cross-env CLOUDFLARE_API_TOKEN=xxx npx wrangler d1 execute voxta-docs --remote --file=clean-import-kb-0.sql
# ... repeat for each batch file
```

### Populate Vector Index

After importing content, populate Vectorize with embeddings:

```bash
PAYLOAD_SECRET=your-secret node populate-vectors.js
```

Or manually via API:
```bash
curl -X POST "https://your-site.workers.dev/api/admin/populate-vectors?collection=all&batch=50&page=1" \
  -H "x-admin-secret: your-payload-secret"
```

## Search Implementation

1. User enters query in SearchForm
2. `/api/search` generates embedding via Workers AI
3. Vectorize returns top matches with metadata (title, slug, collection, category)
4. Results displayed with links to `/docs/[slug]` or `/kb/[slug]`

Vector IDs use prefixes: `docs-{id}` or `kb-{id}`

## Link Transformation

The MarkdownContent component automatically transforms links:
- `https://doc.voxta.ai/docs/getting-started/` → `/docs/getting-started`
- `https://doc.voxta.ai/docs/services/#section` → `/docs/services#section`
- External links remain unchanged and open in new tab

## Deployment

Deploys automatically via Cloudflare Pages when pushing to main branch.

Manual deploy:
```bash
pnpm build && pnpm deploy
```

## Admin Access

PayloadCMS admin panel: `https://your-site.workers.dev/admin`

First user registration creates admin account.

## Troubleshooting

**Search returns no results**
- Vectorize index may be empty
- Run `populate-vectors.js` to index all content

**Markdown tables not rendering**
- Ensure MarkdownContent component is used (includes remark-gfm)

**Links point to official docs**
- Ensure MarkdownContent component is used (includes link transformation)

**D1 errors on deploy**
- Run migrations: `pnpm payload migrate`
- Check wrangler.jsonc database_id matches your D1 instance
