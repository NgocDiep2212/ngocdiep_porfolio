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

6. Deploy API to Vercel when ready:

```bash
npx vercel
```

Set the same env vars in the Vercel project dashboard.

7. Chat widget calls `/api/chat` by default (same origin). Override with:

```html
<meta name="portfolio-chat-api" content="https://YOUR-APP.vercel.app/api/chat" />
```

## Knowledge updates

Edit files under `knowledge/`, then re-run `npm run ingest`.

## Score threshold

`RAG_SCORE_THRESHOLD` is Qdrant **Cosine similarity** (higher = more similar). Default `0.55` — answers are refused when the best hit scores below this. Tune with `npm run eval:golden`.
