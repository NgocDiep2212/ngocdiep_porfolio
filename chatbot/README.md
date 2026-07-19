# Portfolio RAG Chatbot

LangChain.js + Gemini + Qdrant, served via Vercel `/api/chat`, embedded in `index.html`.

## Setup

1. Create a free [Qdrant Cloud](https://cloud.qdrant.io/) cluster and note URL + API key.
2. Create a [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini).
3. Copy `.env.example` → `.env` and fill values.
4. Install and ingest:

```bash
npm install
npm run ingest
npm run eval:golden
```

5. Run locally (**no Vercel login**):

```bash
npm run dev
```

Open http://localhost:3000 — static portfolio + `/api/chat`.

Optional: `npm run dev:vercel` if you want Vercel CLI (requires `npx vercel login` with the [new OAuth device flow](https://vercel.com/changelog/new-vercel-cli-login-flow); upgrade with `npm i vercel@latest -D`).

6. Deploy to Vercel (CLI):

```bash
npm i vercel@latest -D
npx vercel login
# browser OAuth device flow — approve, then:
npx vercel
# production:
npx vercel --prod
```

Set **Environment Variables** in Vercel Project → Settings → Environment Variables (Production + Preview):

| Name | Example |
|------|---------|
| `GOOGLE_API_KEY` | from AI Studio |
| `QDRANT_URL` | `https://xxx.qdrant.io` |
| `QDRANT_API_KEY` | Qdrant key |
| `QDRANT_COLLECTION` | `portfolio_kb` |
| `EMBEDDING_MODEL` | `gemini-embedding-001` |
| `CHAT_MODEL` | `gemini-2.5-flash` |
| `RAG_TOP_K` | `6` |
| `RAG_SCORE_THRESHOLD` | `0.55` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app,https://ngocdiep.dev` |

Redeploy after adding env vars.

**Same-origin (recommended):** host this whole repo on Vercel → chat uses `/api/chat` (no meta change).

**Portfolio elsewhere** (e.g. GitHub Pages / ngocdiep.dev): point the widget at the Vercel API:

```html
<meta name="portfolio-chat-api" content="https://YOUR-APP.vercel.app/api/chat" />
```

And include that portfolio origin in `ALLOWED_ORIGINS`.

> Ingest (`npm run ingest`) vẫn chạy **local** (hoặc CI) — không chạy trên Vercel. KB phải đã có trong Qdrant trước khi chat production.

## Knowledge updates

Edit files under `knowledge/`, then re-run `npm run ingest`.

## Score threshold

`RAG_SCORE_THRESHOLD` is Qdrant **Cosine similarity** (higher = more similar). Default `0.55` — answers are refused when the best hit scores below this. Tune with `npm run eval:golden`.
