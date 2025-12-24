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
- **Discord OAuth** - User authentication via Discord

## Content

| Collection | Count | Description |
|------------|-------|-------------|
| docs-pages | 84 | Official documentation + dev guides |
| kb-articles | 1,005 | Community knowledge base articles |
| discord-users | varies | Users who logged in via Discord |

## PayloadCMS Collections

### DocsPage (`src/collections/DocsPage.ts`)
- Fields: title, slug, content (textarea), category, sortOrder, originalUrl, relatedKB
- `category`: One of documentation, installing, interface, creator-studio, modules, articles
- `sortOrder`: Number for ordering within category (lower = first)

### KBArticle (`src/collections/KBArticle.ts`)
- Fields: title, slug, content (textarea), type, category, topics[], keywords[], confidence
- **Contributor tracking**: contributor (original name), originalContributor, lastEditedBy, lastEditedByName, lastEditedAt, editHistory[]
- Edit tracking fields link to DiscordUsers

### DiscordUsers (`src/collections/DiscordUsers.ts`)
- Fields: discordId, username, displayName, avatar, claimedContributorNames[], editCount, lastLogin, isAdmin
- `claimedContributorNames`: Array of contributor names claimed by this user
- `isAdmin`: Boolean for admin privileges

## User Features

### Discord Login
- Login button in header navigates to `/api/auth/discord`
- OAuth callback at `/api/auth/discord/callback`
- User session stored in `discord_user` cookie
- `/api/auth/me` returns current user, `/api/auth/logout` clears session

### Contributor Profiles
- `/contributor/[name]` shows articles by that contributor
- Logged-in users can claim contributor names to link to their Discord
- Claimed profiles show Discord avatar and display name

### KB Article Editing
- Logged-in users see "Edit" button on KB articles
- Edit page at `/kb/[slug]/edit` with title and markdown content
- `/api/kb/edit` saves changes via PayloadCMS
- Tracks last edited by and maintains edit history

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

# Secrets (use correct project name!)
npx cross-env CLOUDFLARE_API_TOKEN=xxx npx wrangler secret put SECRET_NAME --name voxta-unoffical-docs
```

## Project Structure

```
site/
├── src/
│   ├── app/
│   │   ├── (frontend)/           # Public pages
│   │   │   ├── docs/[slug]/      # Doc detail pages
│   │   │   ├── kb/[slug]/        # KB article pages
│   │   │   │   └── edit/         # KB edit page
│   │   │   ├── contributor/[name]/ # Contributor profiles
│   │   │   ├── docs/page.tsx     # Docs list (grouped by category)
│   │   │   ├── kb/page.tsx       # KB list
│   │   │   ├── leaderboard/      # Top contributors page
│   │   │   ├── components/       # HeaderSearch, DiscordLogin
│   │   │   └── page.tsx          # Homepage with search + quick-links
│   │   ├── (payload)/            # PayloadCMS admin UI
│   │   └── api/
│   │       ├── search/route.ts   # Vector search endpoint
│   │       ├── auth/             # Discord OAuth routes
│   │       │   ├── discord/      # OAuth initiate & callback
│   │       │   ├── me/           # Get current user
│   │       │   └── logout/       # Clear session
│   │       ├── kb/edit/          # KB article editing
│   │       ├── contributor/claim/ # Claim contributor name
│   │       └── admin/
│   │           └── populate-vectors/route.ts
│   ├── collections/
│   │   ├── DocsPage.ts
│   │   ├── KBArticle.ts
│   │   ├── DiscordUsers.ts
│   │   └── Media.ts
│   ├── components/
│   │   ├── MarkdownContent.tsx   # Markdown renderer with link transformation
│   │   └── SearchForm.tsx        # Search UI component
│   └── payload.config.ts         # Payload configuration
├── wrangler.jsonc                # Cloudflare bindings config
└── populate-vectors.js           # Script to populate Vectorize index
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search?q=query` | GET | Vector search for docs and KB |
| `/api/auth/discord` | GET | Initiate Discord OAuth |
| `/api/auth/discord/callback` | GET | OAuth callback |
| `/api/auth/me` | GET | Get current logged-in user |
| `/api/auth/logout` | GET | Clear session cookie |
| `/api/kb/edit` | POST | Update KB article (requires login) |
| `/api/contributor/claim` | POST | Claim contributor name (requires login) |
| `/api/admin/populate-vectors` | POST | Populate Vectorize index |

## Cloudflare Configuration

### Project
- **Name**: `voxta-unoffical-docs`
- **Database**: `voxta-docs` (D1)
- **Bucket**: `voxta-docs` (R2)
- **Index**: `voxta-docs-index` (Vectorize)

### Secrets (set via wrangler)
```bash
# Set secrets for the worker
npx cross-env CLOUDFLARE_API_TOKEN=xxx npx wrangler secret put PAYLOAD_SECRET --name voxta-unoffical-docs
npx cross-env CLOUDFLARE_API_TOKEN=xxx npx wrangler secret put DISCORD_CLIENT_ID --name voxta-unoffical-docs
npx cross-env CLOUDFLARE_API_TOKEN=xxx npx wrangler secret put DISCORD_CLIENT_SECRET --name voxta-unoffical-docs
npx cross-env CLOUDFLARE_API_TOKEN=xxx npx wrangler secret put NEXT_PUBLIC_APP_URL --name voxta-unoffical-docs
```

### Environment Variables
- `PAYLOAD_SECRET` - Secret for Payload admin & API auth
- `CLOUDFLARE_API_TOKEN` - For wrangler CLI operations
- `DISCORD_CLIENT_ID` - Discord OAuth app client ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth app client secret
- `NEXT_PUBLIC_APP_URL` - Site URL (https://voxta.axailotl.ai)

## Data Import

### Import Docs
```bash
node clean-import-docs.cjs
npx cross-env CLOUDFLARE_API_TOKEN=xxx npx wrangler d1 execute voxta-docs --remote --file=clean-import-docs.sql
```

### Import KB Articles
```bash
node clean-import-kb.cjs
# Execute each batch file (kb-0.sql through kb-N.sql)
npx cross-env CLOUDFLARE_API_TOKEN=xxx npx wrangler d1 execute voxta-docs --remote --file=clean-import-kb-0.sql
```

### Populate Vector Index
```bash
PAYLOAD_SECRET=your-secret node populate-vectors.js
```

## Admin Access

PayloadCMS admin panel: `https://voxta.axailotl.ai/admin`

Admin users are managed in the `users` collection in PayloadCMS.

## Troubleshooting

**Discord login shows "not configured"**
- Ensure DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET secrets are set
- Use `wrangler secret put --name voxta-unoffical-docs`

**Search returns no results**
- Vectorize index may be empty
- Run `populate-vectors.js` to index all content

**Edits not saving**
- Check user is logged in (cookie present)
- Verify PayloadCMS can write to D1

**D1 errors on deploy**
- Run migrations: `pnpm payload migrate`
- Check wrangler.jsonc database_id matches your D1 instance
