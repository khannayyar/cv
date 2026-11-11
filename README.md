# Academic CV — Dr. Nayyar Ahmed Khan

A static, responsive academic portfolio with a shared US-inspired navy, blue, red, white and cool grey design, JSON-driven CV content, PDF/LaTeX exports, and a Google Scholar importer.

## Preview locally

From the project directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765. Use an HTTP server rather than opening HTML files directly, because the pages fetch JSON data.

## Content and design

- `index.html`: redesigned homepage, saved Scholar metrics, recent publications, teaching, and CV downloads.
- Other HTML pages: complete education, experience, teaching, research, publications, projects, patents, awards, certifications, badges, community, testimonials, skills, and contact information.
- `data/*.json`: source records; edit these to update your CV. Keep the existing schema.
- `css/site.css`: shared design tokens, layouts, responsive styling, reduced-motion and print rules.
- `js/site.js`: shared accessible navigation. Navigation HTML is present in every page so links work without a JavaScript render step.
- `js/home.js`: homepage metrics, publications sorted by year, and trainer highlights.
- `js/export.js`: existing PDF and LaTeX exports, with coordinated PDF colors.
- `assets/profile.jpg`: profile portrait.

The site retains Tailwind CSS for existing page layouts and exports. Tailwind, Google Fonts, Font Awesome, and jsPDF currently load from external CDNs; an internet connection is required for those resources. Homepage layout and navigation use the local stylesheet.

## Google Scholar updates

The previous workflow called a missing `get_publications.py` file and staged `publications.json`, while the site reads `data/research.json`. The repaired workflow runs `scripts/update_research.py` and commits the correct file.

The scheduled workflow checks eligibility daily at **05:37 UTC / 08:37 Saudi Arabia time**. It requests Scholar data only when the last successful update is **at least 15 calendar days old**. This maintains the interval across month/year boundaries. A failed request leaves the saved date unchanged and can retry at the next daily check. Manual runs force an immediate refresh.

The importer:

- Uses `SCHOLAR_ID` from Actions secrets when present, otherwise reads the public Scholar link from `data/personal-info.json`.
- Fetches citation count, h-index, i10-index, and all publication pages.
- Retries transient connection failures, HTTP 429 and server errors with bounded backoff.
- Rejects blocked/CAPTCHA pages, missing metrics, repeated pages, and unverified pagination.
- Rejects empty results and publication counts that unexpectedly fall by more than 20%.
- Preserves curated DOI URLs, abstracts, and other existing fields for matching publications.
- Replaces the JSON atomically only after validation. Failures return a nonzero exit status and preserve the last good file.
- Provides `--dry-run` to validate live data without writing files. A dry run never generates placeholders.

Google can block automated traffic, including GitHub-hosted runners; the importer cannot guarantee access. The site continues displaying its last successful snapshot and its update date if a fetch fails. Check the failed Action logs and use a manual retry when access resumes. If you intentionally remove more than 20% of publications from Scholar, review the saved profile and the count safeguard before accepting that change.

### Activate on GitHub

1. Upload/commit this folder to your existing repository’s **default branch**.
2. Ensure GitHub Actions is enabled. Optionally set the `SCHOLAR_ID` repository secret; the supplied public profile works without it.
3. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
4. Run **Deploy academic CV to GitHub Pages** once to publish the redesign.
5. Run **Update Google Scholar profile** manually to verify the importer on the GitHub runner. Scheduled checks then manage the 15-day interval.

The Pages workflow packages only public HTML, CSS, JavaScript, assets, and data. Normal default-branch pushes deploy the site. Successful Scholar refreshes explicitly call the same reusable deployment workflow: commits made with `GITHUB_TOKEN` do not trigger another ordinary push workflow automatically. Branch protection rules must permit the bot’s data commit; otherwise the commit step will fail visibly and the repository administrator will need to allow it or adopt a pull-request update flow.

GitHub schedules can be delayed and run only from the default branch; inactive public repositories may have scheduled workflows disabled after 60 days. See [GitHub schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) and [GitHub token event behavior](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow#triggering-a-workflow-from-a-workflow).

### Local importer checks

```sh
python3 -m venv /tmp/cv-venv
/tmp/cv-venv/bin/python -m pip install -r scripts/requirements.txt
/tmp/cv-venv/bin/python -m unittest discover -s tests -v
/tmp/cv-venv/bin/python scripts/update_research.py --dry-run
```

To save a live update, omit `--dry-run`. Use `--if-due` to apply the scheduled eligibility check locally.

## Contact form

The existing Google Apps Script contact integration is preserved. Its configuration is in `js/contact.js`, with server-side example code in `scripts/google-apps-script.js`. Update the deployment URL when replacing the form backend.

## Static packaging

```sh
python3 scripts/build_site.py
```

The generated `dist/` directory contains the deployable website. It is ignored by Git; GitHub Actions uploads it as the Pages artifact.

## AI, healthcare and blockchain research presentation

The homepage, biography, research overview, research philosophy, expertise, teaching philosophy, publication highlights and project presentation emphasize AI/ML, healthcare informatics, explainable drug discovery, blockchain and federated learning. Existing qualifications, job titles, publication metadata and project outcomes remain historical records.

`data/research-focus.json` stores editorial themes, selected publication references and clearly labeled future directions. References resolve against `data/research.json` so Scholar refreshes update citations without replacing the editorial focus. Missing references are omitted, and the homepage falls back to recent publications if the editorial file cannot load. Add new highlights by selecting exact titles and links from the saved Scholar data. Healthcare descriptions refer to computational research; they do not assert clinical validation.

## Chronological display

`js/date-order.js` applies newest-first ordering to dated lists across the website and exports, including projects, publications, education, experience, awards, teaching years, organization memberships, testimonials and research highlights. Ongoing dated roles appear first; ranges use their latest year/date, with the newest start as a tiebreaker. Undated records follow dated records and retain their relative order. No dates are invented for badges, credentials, or degrees labeled only “Completed”. Topic lists, research themes, skills, and other undated content keep their editorial order. Explicit publication and patent sort controls remain available.

## LinkedIn professional-data import

The user-supplied LinkedIn export enriches certifications, skills, education dates, projects, honors, IP records, publication descriptions, languages, professional learning and service. `data/professional-profile.json` contains only selected professional fields. `js/professional-profile.js` renders searchable credential and publication-description catalogs, plus contextual sections on the homepage, About, Experience, Community, Skills and Teaching pages.

Run `python3 scripts/import_linkedin.py /absolute/path/to/export.zip` to import another compatible export. The importer reads a fixed professional-file allowlist without extracting the ZIP; it excludes private account, contact, messaging, invitation and job-search records. Do not place the raw archive in the repository. Existing Scholar citation totals and publication years remain authoritative for that record. Conflicting institutions, project timelines and publication dates are recorded in `docs/linkedin-import-report.md`. Public credential links are included; license numbers are omitted.

User-confirmed institutions take precedence over future LinkedIn education imports. LinkedIn project timelines overwrite matching project durations; chronological project display uses the project timeline ahead of the publication date.

Typography uses Manrope for headings and Source Sans 3 for body text, with responsive heading sizes, larger reading text and consistent metadata sizes. The font files load from Google Fonts with system fallbacks and font-display swap.

## Scholar HTTP 403 on GitHub runners

Google Scholar can deny direct requests from GitHub-hosted runner IPs. A missing `SCHOLAR_ID` secret is not a failure when the public profile URL is configured; the importer reads its ID from that URL.

For an alternative unattended transport, create a SerpApi account and add its private key as the repository Actions secret `SERPAPI_API_KEY`. The importer automatically uses the Google Scholar Author API when this secret is present. No provider account is created and no paid plan is purchased by this code change; review provider quotas and pricing before enabling it. Each profile page consumes a provider request. Credentials remain in Actions secrets and are never written into website JSON.

Without a key, direct access is retained and may still fail with HTTP 403. Adding `SCHOLAR_ID` alone does not resolve an IP block. API errors, missing metrics, repeated/empty pages or a large publication-count drop preserve the last good snapshot and fail visibly; the next daily eligibility check can retry. The 15-day interval still uses the last successful update. Manual runs force an attempt. This provider is independent of Google and does not guarantee future availability.

Setup: upload the revised `scripts/update_research.py` and `.github/workflows/update-research.yml`, add the API secret under Settings → Secrets and variables → Actions, then start a new manual Scholar workflow run. See https://serpapi.com/google-scholar-author-api for the provider contract. A free alternative is running the importer locally on a network where Scholar permits access, then committing the resulting `data/research.json`.
