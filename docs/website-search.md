# Free website search

The homepage now uses browser-only search. It does not call DeepSeek, OpenAI, Cloudflare, or another AI provider, and requires no API key, subscription or backend. Results are excerpts and links to existing website pages, not generated AI answers.

`js/search.js` loads the public `data/search-index.json` file when a visitor searches. `js/profile-search.js` ranks matching entries with topic synonyms. Queries remain in the browser. A failed index load can be retried by searching again.

The normal GitHub Pages build runs `scripts/build_search_index.py` through `scripts/build_site.py`, so the public index stays aligned with CV data and page changes.

Push these changes to GitHub and let the existing Pages workflow deploy them. No additional hosting setup is required.

## Retire the unused Cloudflare backend

The website no longer contacts the Worker, but removing local files does not delete a deployed Worker. In Cloudflare, delete the unused `cv` Worker from its settings, or disable its production workers.dev route and remove its private API key. Disconnect any Cloudflare repository build connection for this backend. You can keep your Cloudflare account. Revoke the unused provider key in its provider dashboard if it will not be used elsewhere.
