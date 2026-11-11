# Profile assistant: setup and operation

The homepage widget is implemented and works immediately as website search. DeepSeek-generated answers require deploying the included Cloudflare Worker and setting a private API key. The website remains on GitHub Pages. Nothing has been deployed or purchased by this implementation.

## What is ready

- `js/assistant.js`: accessible homepage prompt, example questions, loading/stop/error states, plain-text answers, and local website search fallback.
- `scripts/build_search_index.py`: builds `data/search-index.json` from public CV JSON and page text. `scripts/build_site.py` regenerates it before every Pages build, including Scholar updates.
- `js/profile-search.js`: shared lexical retrieval, with topic synonyms. It searches the website rather than the open internet.
- `backend/worker.js`: retrieves the published index, selects up to six records, and calls DeepSeek. The default is `deepseek-flash`, with thinking disabled and a 700-token answer limit. Change `DEEPSEEK_MODEL` if needed for your account.
- `backend/wrangler.jsonc`: Cloudflare configuration, allowed origin, fixed public-site URL and rate-limit bindings.
- `data/assistant-config.json`: public backend URL only. Never place an API key here.

## Browser-based setup (no local tools required)

1. Push these website changes to the existing `khannayyar/cv` GitHub repository.
2. Create/sign into a Cloudflare account at https://dash.cloudflare.com. In Workers & Pages, create a Worker by importing the GitHub repository. Grant access only to the `cv` repository if you prefer.
3. Use Worker/project name `nayyar-profile-assistant`. Keep the root directory at the repository root, leave the optional build command empty, and set the deploy command to:

   ```sh
   npx wrangler deploy --config backend/wrangler.jsonc
   ```

   If preview deployments are enabled, set their command to `npx wrangler preview --config backend/wrangler.jsonc`, or leave previews disabled. This deploys the backend only; GitHub Pages continues hosting the public site.
4. After deployment, open the Worker’s **Settings → Variables & Secrets**. Add a **Secret** named `DEEPSEEK_API_KEY` and enter your DeepSeek key there. Use the runtime secret section, not build-only environment variables.
5. Copy the public `workers.dev` URL Cloudflare displays. Set `data/assistant-config.json` to that URL with `/ask` appended, then push that change to GitHub.
6. Open the website and ask an example question. Follow the source links to check the response. If anything fails, share the error message and public Worker URL, never the private key.

Cloudflare’s Git integration setup is documented at https://developers.cloudflare.com/workers/ci-cd/builds/configuration/.

## Alternative: terminal setup

1. Create/sign into a Cloudflare account. Use a computer with a supported Node.js LTS installation and npm.
2. In a terminal, open the website project folder. Run:

   ```sh
   npx wrangler login
   npx wrangler deploy --config backend/wrangler.jsonc
   npx wrangler secret put DEEPSEEK_API_KEY --config backend/wrangler.jsonc
   ```

   The login opens Cloudflare's authorization page. The secret command prompts privately for your DeepSeek API key; paste it there, not in a shell command, source file, chat message, or GitHub variable. Do not create a `.dev.vars` file inside a public asset folder. The rate-limit bindings in the configuration deploy with the Worker.

3. The deploy command prints a URL like `https://nayyar-profile-assistant.YOUR-SUBDOMAIN.workers.dev`. Update `data/assistant-config.json`:

   ```json
   {"endpoint":"https://nayyar-profile-assistant.YOUR-SUBDOMAIN.workers.dev/ask"}
   ```

4. Commit/push the website changes to publish the widget, updated search index and configuration through the existing GitHub Pages workflow.
5. Ask a sample question on the live site. The badge should say “AI answers · DeepSeek” when configured; a successfully generated response is labeled “AI-generated answer” and includes source links. An unavailable backend retains local search results and explains that AI is unavailable.

If the DeepSeek account needs credit, review its current pricing and usage limits before enabling public access. No key or Cloudflare credentials are required to use local website search.

## Behavior and limits

The backend accepts only questions, not visitor-supplied system prompts, context, API URLs or model names. It loads evidence from the configured public website. It never follows source links or performs autonomous actions. The DeepSeek prompt directs the model to use website evidence only; citations are filtered to retrieved record IDs, and answers without valid cited records are not displayed as AI answers. Model generation is not a factual guarantee: visitors should check the linked evidence.

Questions are limited to 1,000 characters and requests to 4 KiB; DeepSeek calls time out after 25 seconds. Per-network limits allow five requests per minute, plus a shared cap of 30 per minute per Cloudflare location. Cloudflare's limiter is approximate, not a strict global daily spending cap. IP-based limits may affect visitors sharing a network. Origin checks reduce browser misuse but do not authenticate visitors or prevent scripts from calling a public endpoint. Review provider billing controls and Cloudflare protections if traffic grows.

The application does not store question history or log prompts, API keys, or provider responses. Questions and selected public profile excerpts are sent to DeepSeek when AI is enabled; Cloudflare and DeepSeek may process request metadata under their own policies. The widget tells visitors not to submit confidential information.

No clinical effectiveness, availability for hire, or unlisted credentials should be inferred from the generated answers. Research prototypes and future directions remain distinct from completed work. Citation metrics should include their saved update date.

## Official references

- DeepSeek API: https://api-docs.deepseek.com/
- Cloudflare rate limiting: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Cloudflare secrets: https://developers.cloudflare.com/workers/configuration/secrets/

## Updating the knowledge

Edit the normal CV JSON or HTML and deploy. The search index rebuilds automatically; the Worker refreshes its in-memory index after five minutes. The original LinkedIn ZIP, private files and backend code are excluded from the static Pages package. Keep the public CV data accurate; the assistant reflects that data.
