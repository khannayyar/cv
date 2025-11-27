import json
import os
import re
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

def _log(msg: str):
    ts = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    print(f"[{ts}] {msg}")


def _to_int(value, default=0):
    try:
        return int(str(value).strip())
    except Exception:
        return default


def _get_with_retry(session: requests.Session, url: str, headers: dict, *, timeout: float = 15.0, retries: int = 3, backoff: float = 1.5):
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, headers=headers, timeout=timeout)
            resp.raise_for_status()
            return resp
        except Exception as exc:
            last_exc = exc
            _log(f"Request failed (attempt {attempt}/{retries}): {exc}")
            if attempt < retries:
                sleep_for = backoff ** (attempt - 1)
                time.sleep(sleep_for)
    raise last_exc


def get_google_scholar_publications(scholar_id, *, timeout: float = 15.0, page_size: int = 100, max_pubs: int = 300, fetch_details: bool = False):
    """
    Fetch publications from Google Scholar profile
    
    Args:
        scholar_id: Your Google Scholar user ID (found in your profile URL)
        Example: A0nTCiwAAAAJ
    
    Returns:
        Dictionary containing publication data
    """
    
    base_url = f"https://scholar.google.com/citations?user={scholar_id}&hl=en"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        )
    }
    
    publications = []
    seen_links = set()
    
    try:
        # Prepare session
        session = requests.Session()

        # Fetch profile header (stats) from the base page first
        response = _get_with_retry(session, base_url, headers, timeout=timeout)
        soup = BeautifulSoup(response.content, 'html.parser')
        stats_divs = soup.find_all('td', class_='gsc_rsb_std')
        total_citations = _to_int(stats_divs[0].text) if len(stats_divs) > 0 else 0
        h_index = _to_int(stats_divs[2].text) if len(stats_divs) > 2 else 0
        i10_index = _to_int(stats_divs[4].text) if len(stats_divs) > 4 else 0

        # Paginate through all publication rows
        offset = 0
        while True:
            paged_url = f"https://scholar.google.com/citations?user={scholar_id}&hl=en&cstart={offset}&pagesize={page_size}"
            _log(f"Fetching publications page offset={offset} size={page_size}")
            page_resp = _get_with_retry(session, paged_url, headers, timeout=timeout)
            page_soup = BeautifulSoup(page_resp.content, 'html.parser')
            pub_rows = page_soup.find_all('tr', class_='gsc_a_tr')
            _log(f"Found {len(pub_rows)} rows at offset {offset}")
            if not pub_rows:
                break
            
            for row in pub_rows:
                try:
                    # Title and link
                    title_element = row.find('a', class_='gsc_a_at')
                    title = title_element.text if title_element else 'Unknown'
                    pub_link = 'https://scholar.google.com' + title_element['href'] if title_element else ''
                    # Deduplicate by pub_link
                    if pub_link and pub_link in seen_links:
                        continue
                    # Authors
                    authors_element = row.find('div', class_='gs_gray')
                    authors = authors_element.text if authors_element else 'Unknown'

                    # Journal/Conference
                    venue_elements = row.find_all('div', class_='gs_gray')
                    venue = venue_elements[1].text if len(venue_elements) > 1 else 'Unknown'

                    # Citations
                    citations_element = row.find('a', class_='gsc_a_ac')
                    citations = _to_int(citations_element.text) if citations_element and citations_element.text else 0

                    # Year
                    year_element = row.find('span', class_='gsc_a_h')
                    year = year_element.text if year_element else 'Unknown'

                    # Get additional details from publication page
                    pub_details = {}
                    if fetch_details and pub_link:
                        try:
                            time.sleep(1)  # Be respectful to Google's servers
                            pub_response = _get_with_retry(session, pub_link, headers, timeout=timeout)
                            pub_soup = BeautifulSoup(pub_response.content, 'html.parser')

                            # Try to extract DOI or other identifiers
                            doi_element = pub_soup.find('a', href=re.compile(r'doi\.org'))
                            if doi_element:
                                pub_details['doi'] = doi_element['href']

                            # Extract description/abstract if available
                            desc_element = pub_soup.find('div', class_='gsh_csp')
                            if desc_element:
                                pub_details['abstract'] = desc_element.text.strip()
                        except Exception as e:
                            _log(f"Error fetching publication details: {e}")

                    # Prefer DOI as the primary URL if available, else fall back to the Scholar link
                    final_url = pub_details.get('doi') if 'doi' in pub_details else pub_link

                    publication = {
                        'title': title,
                        'authors': authors,
                        'journal': venue,
                        'year': year,
                        'citations': citations,
                        'link': pub_link,
                        'url': final_url,
                        **pub_details
                    }

                    publications.append(publication)
                    if pub_link:
                        seen_links.add(pub_link)
                except Exception as e:
                    _log(f"Error parsing publication: {e}")
                    continue
            # If fewer than page_size items returned, likely last page
            if len(pub_rows) < page_size:
                break
            
            offset += page_size
            if len(publications) >= max_pubs:
                _log(f"Reached max_pubs={max_pubs}, stopping pagination")
                break

        # Prepare the output data
        research_data = {
            'lastUpdated': datetime.now().strftime('%Y-%m-%d'),
            'totalCitations': total_citations,
            'hIndex': h_index,
            'i10Index': i10_index,
            'publications': publications
        }
        
        return research_data
        
    except Exception as e:
        _log(f"Error fetching Google Scholar data: {e}")
        return None

def main():
    """
    Main function to update research data
    """
    # Read configuration
    scholar_id = os.environ.get('SCHOLAR_ID', '').strip()
    dry_run = os.environ.get('DRY_RUN', '').strip().lower() in { '1', 'true', 'yes' }

    if not scholar_id and not dry_run:
        _log("Error: SCHOLAR_ID environment variable not set")
        _log("Set SCHOLAR_ID in repository secrets to enable automatic updates.")
        return

    if dry_run and not scholar_id:
        _log("DRY_RUN enabled and SCHOLAR_ID missing — generating placeholder research.json")
        research_data = {
            'lastUpdated': datetime.now().strftime('%Y-%m-%d'),
            'totalCitations': 0,
            'hIndex': 0,
            'i10Index': 0,
            'publications': []
        }
    else:
        _log(f"Fetching publications for scholar ID: {scholar_id}")
        fetch_details_env = os.environ.get('FETCH_DETAILS', '').strip().lower() in { '1', 'true', 'yes' }
        # Try to pull up to 300 with page_size=100 by default
        research_data = get_google_scholar_publications(
            scholar_id,
            page_size=int(os.environ.get('PAGE_SIZE', '100')),
            max_pubs=int(os.environ.get('MAX_PUBS', '300')),
            fetch_details=fetch_details_env,
        )

    # Persist results if available
    out_dir = os.path.join('data')
    out_path = os.path.join(out_dir, 'research.json')
    tmp_path = os.path.join(out_dir, 'research.json.tmp')
    os.makedirs(out_dir, exist_ok=True)

    if research_data is not None:
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(research_data, f, indent=4, ensure_ascii=False)
        # Atomic replace
        os.replace(tmp_path, out_path)
        _log("Successfully updated data/research.json")
        _log(f"Total publications: {len(research_data.get('publications', []))}")
        _log(f"Total citations: {research_data.get('totalCitations', 0)}")
        _log(f"h-index: {research_data.get('hIndex', 0)}")
        _log(f"i10-index: {research_data.get('i10Index', 0)}")
    else:
        _log("Failed to fetch research data — keeping existing data/research.json (if any)")

if __name__ == "__main__":
    main()
