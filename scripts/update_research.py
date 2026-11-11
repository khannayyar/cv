"""Refresh the saved Scholar profile, preserving the last good snapshot on failure."""
import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data' / 'research.json'
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; AcademicProfileUpdate/1.0)'}


def utc_now():
    return datetime.now(timezone.utc)


def is_due(data, days=15, now=None):
    """Use successful updates as the clock; failed attempts do not postpone retries."""
    try:
        last = datetime.fromisoformat(data.get('lastUpdated', '')).date()
    except (ValueError, TypeError):
        return True
    return ((now or utc_now()).date() - last).days >= days


def scholar_id_from_profile():
    info = json.loads((ROOT / 'data' / 'personal-info.json').read_text())
    profile = info.get('socialMedia', {}).get('googleScholar', '')
    return parse_qs(urlparse(profile).query).get('user', [''])[0]


def integer(text):
    value = str(text).strip().replace(',', '').replace('\u00a0', '').rstrip('*')
    if not value:
        return 0
    if not value.isdigit():
        raise ValueError(f'Invalid citation metric: {text!r}')
    return int(value)


def get_page(session, scholar_id, offset=0, page_size=100):
    """Bounded retries for transient server/rate errors; never retry CAPTCHA pages."""
    for attempt in range(3):
        try:
            response = session.get('https://scholar.google.com/citations',
                                   params={'user': scholar_id, 'hl': 'en', 'cstart': offset, 'pagesize': page_size},
                                   headers=HEADERS, timeout=(10, 30))
            if response.status_code == 403:
                raise ValueError('Google Scholar blocked this runner (HTTP 403). Configure SERPAPI_API_KEY for API-backed updates, or run the importer locally. Existing data is unchanged.')
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            if soup.select_one('#gs_captcha_ccl, form[action*="sorry"], #captcha') or 'unusual traffic' in soup.get_text(' ', strip=True).lower():
                raise ValueError('Google Scholar returned a CAPTCHA/traffic block. Existing data is unchanged.')
            if not soup.select_one('#gsc_a_b') or not soup.select_one('#gsc_prf_in'):
                raise ValueError('Scholar returned an unrecognized or incomplete profile page.')
            return soup
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as exc:
            if isinstance(exc, requests.HTTPError) and exc.response.status_code not in (429, 500, 502, 503, 504):
                raise
            if attempt == 2:
                raise
            time.sleep(5 * (2 ** attempt))
    raise RuntimeError('Scholar request failed')


def parse_metrics(soup):
    stats = soup.select('#gsc_rsb_st td.gsc_rsb_std')
    if len(stats) < 6:
        raise ValueError('Scholar citation metrics are missing; refusing to save zeros.')
    return dict(zip(('totalCitations', 'hIndex', 'i10Index'), (integer(stats[i].get_text()) for i in (0, 2, 4))))


def parse_publications(soup):
    publications = []
    for row in soup.select('#gsc_a_b tr.gsc_a_tr'):
        title = row.select_one('a.gsc_a_at')
        if title is None or not title.get_text(strip=True) or not title.get('href'):
            raise ValueError('Incomplete publication row; refusing a partial update.')
        venue = row.select('div.gs_gray')
        if len(venue) < 2:
            raise ValueError('Publication authors or venue are missing.')
        link = urljoin('https://scholar.google.com', title['href'])
        year = row.select_one('.gsc_a_y .gsc_a_h')
        citation = row.select_one('a.gsc_a_ac')
        publications.append({'title': title.get_text(strip=True), 'authors': venue[0].get_text(strip=True),
                             'journal': venue[1].get_text(strip=True), 'year': year.get_text(strip=True) if year else '',
                             'citations': integer(citation.get_text() if citation else ''), 'link': link, 'url': link})
    return publications


def publication_key(publication):
    link = publication.get('link') or publication.get('url', '')
    identifier = parse_qs(urlparse(link).query).get('citation_for_view', [''])[0]
    return identifier or publication.get('title', '').strip().casefold()


def fetch_research(scholar_id, previous=None, page_size=100, max_pubs=2000):
    previous = previous or {}
    known = {publication_key(p): p for p in previous.get('publications', [])}
    publications, seen = [], set()
    with requests.Session() as session:
        soup = get_page(session, scholar_id, page_size=page_size)
        metrics = parse_metrics(soup)
        offset = 0
        while True:
            batch = parse_publications(soup)
            for pub in batch:
                key = publication_key(pub)
                if key in seen:
                    raise ValueError('Scholar repeated publications during pagination; update may be incomplete.')
                seen.add(key)
                # Keep curated abstracts, DOI URLs and other metadata while refreshing Scholar fields.
                old = known.get(key, {})
                merged = {**old, **pub}
                if old.get('url') and 'scholar.google.' not in old['url']:
                    merged['url'] = old['url']
                publications.append(merged)
            next_button = soup.select_one('#gsc_bpf_more')
            if next_button is None:
                raise ValueError('Scholar pagination control missing; cannot verify completeness.')
            if next_button.has_attr('disabled'):
                break
            if not batch or len(publications) >= max_pubs:
                raise ValueError('Pagination stalled or exceeded the safety limit; refusing a truncated update.')
            offset += len(batch)
            time.sleep(3)
            soup = get_page(session, scholar_id, offset=offset, page_size=page_size)
    if not publications:
        raise ValueError('Scholar returned no publications; keeping the saved profile.')
    old_count = len(previous.get('publications', []))
    if old_count and len(publications) < old_count * 0.8:
        raise ValueError('Publication count fell by more than 20%; review the profile before replacing saved data.')
    return {**previous, 'lastUpdated': utc_now().date().isoformat(), **metrics, 'publications': publications}


def fetch_research_api(scholar_id, api_key, previous=None, max_pubs=2000):
    """Optional SerpApi transport; no CAPTCHA handling or runner-IP workarounds."""
    previous = previous or {}
    known = {publication_key(p): p for p in previous.get('publications', [])}
    publications, seen = [], set()
    metrics = None
    offset = 0
    with requests.Session() as session:
        while True:
            # Always use the fixed provider endpoint; never forward a key to pagination URLs.
            try:
                response = session.get('https://serpapi.com/search.json', params={
                    'engine': 'google_scholar_author', 'author_id': scholar_id,
                    'hl': 'en', 'num': 100, 'start': offset, 'api_key': api_key,
                }, timeout=(10, 60))
                response.raise_for_status()
                payload = response.json()
            except (requests.RequestException, ValueError):
                # Request exception URLs can contain the key; do not log those URLs.
                raise ValueError('Scholar API request failed. Check SERPAPI_API_KEY, provider status and account quota.') from None
            if not isinstance(payload, dict) or payload.get('error') or payload.get('search_metadata', {}).get('status') != 'Success':
                raise ValueError('Scholar API did not return a successful result. Check the provider dashboard.')
            if metrics is None:
                try:
                    table = payload['cited_by']['table']
                    metrics = {key: integer(table[i][field]['all']) for i, (key, field) in enumerate([
                        ('totalCitations', 'citations'), ('hIndex', 'h_index'), ('i10Index', 'i10_index')])}
                except (KeyError, IndexError, TypeError):
                    raise ValueError('Scholar API citation metrics are missing; saved data is unchanged.') from None
            batch = payload.get('articles')
            if not isinstance(batch, list) or not batch:
                raise ValueError('Scholar API returned no articles on a requested page; refusing a partial update.')
            for article in batch:
                if not isinstance(article, dict) or not article.get('title') or not article.get('link'):
                    raise ValueError('Scholar API returned an incomplete article.')
                pub = {'title': article['title'], 'authors': article.get('authors', ''),
                       'journal': article.get('publication', ''), 'year': str(article.get('year', '')),
                       'citations': integer(article.get('cited_by', {}).get('value', 0)),
                       'link': article['link'], 'url': article['link']}
                key = publication_key(pub)
                if key in seen:
                    raise ValueError('Scholar API repeated an article; refusing an incomplete update.')
                seen.add(key)
                old = known.get(key, {})
                merged = {**old, **pub}
                if old.get('url') and 'scholar.google.' not in old['url']:
                    merged['url'] = old['url']
                publications.append(merged)
            if not payload.get('serpapi_pagination', {}).get('next'):
                break
            if len(publications) >= max_pubs:
                raise ValueError('Scholar API exceeded the publication safety limit.')
            offset += len(batch)
    if len(publications) < len(previous.get('publications', [])) * 0.8:
        raise ValueError('API publication count fell by more than 20%; saved data is unchanged.')
    return {**previous, 'lastUpdated': utc_now().date().isoformat(), **metrics, 'publications': publications}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--if-due', action='store_true', help='Fetch only if 15 days have elapsed since success')
    parser.add_argument('--dry-run', action='store_true', help='Fetch and validate without changing any files')
    args = parser.parse_args(argv)
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
    if args.if_due and not is_due(previous):
        print('Last successful update is less than 15 days old; no Scholar request needed.')
        return 0
    scholar_id = os.environ.get('SCHOLAR_ID', '').strip() or scholar_id_from_profile()
    if not re.fullmatch(r'[A-Za-z0-9_-]+', scholar_id):
        print('ERROR: Set SCHOLAR_ID or a valid Google Scholar profile in data/personal-info.json.', file=sys.stderr)
        return 1
    try:
        api_key = os.environ.get('SERPAPI_API_KEY', '').strip()
        if api_key:
            print('Fetching Scholar profile through the configured API provider.')
            result = fetch_research_api(scholar_id, api_key, previous)
        else:
            print('No API key configured; using direct Scholar access (GitHub runners may be blocked).')
            result = fetch_research(scholar_id, previous)
        if args.dry_run or os.environ.get('DRY_RUN', '').lower() in ('1', 'true', 'yes'):
            print(f"Validated {len(result['publications'])} publications; dry run left all files unchanged.")
            return 0
        temporary = OUTPUT.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(result, indent=4, ensure_ascii=False) + '\n', encoding='utf-8')
        temporary.replace(OUTPUT)
        print(f"Updated {len(result['publications'])} publications, {result['totalCitations']} citations.")
        return 0
    except (requests.RequestException, ValueError, OSError) as exc:
        print(f'ERROR: {exc}\nExisting data/research.json has been preserved.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
