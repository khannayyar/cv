"""Offline regression tests: dates, pagination, blocking and preservation of saved data."""
import importlib.util
import unittest
from datetime import datetime, timezone
from unittest.mock import patch, Mock
from pathlib import Path
from bs4 import BeautifulSoup
import requests

spec = importlib.util.spec_from_file_location('updater', Path(__file__).resolve().parents[1] / 'scripts/update_research.py')
u = importlib.util.module_from_spec(spec)
spec.loader.exec_module(u)


def profile(items=1, more=False, metrics=True, start=0):
    stats = '<table id="gsc_rsb_st">' + ''.join(f'<td class="gsc_rsb_std">{n}</td>' for n in ['1,234','100','12','3','25','5']) + '</table>' if metrics else ''
    rows = ''.join(f'<tr class="gsc_a_tr"><td><a class="gsc_a_at" href="/citations?citation_for_view=TEST:{i}">Paper {i}</a><div class="gs_gray">Author</div><div class="gs_gray">Journal</div></td><td><a class="gsc_a_ac">1,234*</a></td><td class="gsc_a_y"><span class="gsc_a_h">2025</span></td></tr>' for i in range(start,start+items))
    return BeautifulSoup(f'<div id="gsc_prf_in">Name</div>{stats}<table><tbody id="gsc_a_b">{rows}</tbody></table><button id="gsc_bpf_more" {"" if more else "disabled"}>More</button>', 'html.parser')


class ImporterTests(unittest.TestCase):
    def test_exact_fifteen_days_across_month_and_year(self):
        self.assertFalse(u.is_due({'lastUpdated':'2025-12-25'}, now=datetime(2026,1,8,tzinfo=timezone.utc)))
        self.assertTrue(u.is_due({'lastUpdated':'2025-12-25'}, now=datetime(2026,1,9,tzinfo=timezone.utc)))
        self.assertTrue(u.is_due({'lastUpdated':'2026-02-20'}, now=datetime(2026,3,7,tzinfo=timezone.utc)))
        self.assertTrue(u.is_due({'lastUpdated':'invalid'}))

    def test_missing_metrics_rejected(self):
        with self.assertRaisesRegex(ValueError, 'metrics are missing'):
            u.parse_metrics(profile(metrics=False))

    def test_numbers_and_metadata_are_parsed(self):
        self.assertEqual(u.parse_metrics(profile()), {'totalCitations':1234,'hIndex':12,'i10Index':25})
        self.assertEqual(u.parse_publications(profile())[0]['citations'],1234)

    @patch.object(u.time, 'sleep')
    @patch.object(u, 'get_page')
    def test_all_pages_and_curated_metadata(self, get, sleep):
        get.side_effect = [profile(more=True),profile(start=1)]
        old = {'publications':[{'title':'Paper 0','link':'https://scholar.google.com/citations?citation_for_view=TEST:0','url':'https://doi.org/10.1000/example','abstract':'Keep me'}]}
        result = u.fetch_research('TEST',old)
        self.assertEqual(len(result['publications']),2)
        self.assertEqual(get.call_args.kwargs['offset'],1)
        self.assertEqual(result['publications'][0]['abstract'],'Keep me')
        self.assertEqual(result['publications'][0]['url'],'https://doi.org/10.1000/example')

    @patch.object(u.time, 'sleep')
    @patch.object(u, 'get_page')
    def test_repeated_pages_rejected(self, get, sleep):
        get.side_effect=[profile(more=True),profile()]
        with self.assertRaisesRegex(ValueError,'repeated'):
            u.fetch_research('TEST')

    @patch.object(u, 'get_page', return_value=profile(items=0))
    def test_empty_update_rejected(self, get):
        with self.assertRaisesRegex(ValueError,'no publications'):
            u.fetch_research('TEST')

    @patch.object(u, 'get_page', return_value=profile(items=1))
    def test_large_unexpected_loss_rejected(self, get):
        with self.assertRaisesRegex(ValueError,'20%'):
            u.fetch_research('TEST', {'publications':[{'title':str(i)} for i in range(10)]})

    def test_captcha_rejected(self):
        session=Mock()
        session.get.return_value=Mock(status_code=200,content=b'<form action="/sorry/"><input id="captcha"></form>')
        with self.assertRaisesRegex(ValueError,'CAPTCHA'):
            u.get_page(session,'TEST')

    @patch.object(u.time,'sleep')
    def test_transient_failure_retried(self, sleep):
        session=Mock()
        session.get.side_effect=[requests.Timeout(),Mock(status_code=200,content=str(profile()).encode())]
        self.assertIsNotNone(u.get_page(session,'TEST'))
        self.assertEqual(session.get.call_count,2)

    @patch.object(u,'fetch_research',side_effect=ValueError('blocked'))
    def test_failed_fetch_preserves_file_and_returns_failure(self, fetch):
        before=u.OUTPUT.read_bytes()
        self.assertEqual(u.main([]),1)
        self.assertEqual(u.OUTPUT.read_bytes(),before)

    @patch.object(u,'fetch_research',return_value={'publications':[{}]})
    def test_dry_run_never_writes(self, fetch):
        before=u.OUTPUT.read_bytes()
        self.assertEqual(u.main(['--dry-run']),0)
        self.assertEqual(u.OUTPUT.read_bytes(),before)

    @patch.object(u,'is_due',return_value=False)
    @patch.object(u,'fetch_research')
    def test_recent_success_skips_network(self, fetch, due):
        self.assertEqual(u.main(['--if-due']),0)
        fetch.assert_not_called()


if __name__ == '__main__':
    unittest.main()

class APITests(unittest.TestCase):
    def payload(self, identifier='0', more=False):
        return {'search_metadata': {'status':'Success'},
                'cited_by': {'table':[{'citations':{'all':1234}},{'h_index':{'all':12}},{'i10_index':{'all':25}}]},
                'articles':[{'title':'Paper '+identifier,'link':'https://scholar.google.com/citations?citation_for_view=TEST:'+identifier,'authors':'A','publication':'Journal','year':'2026','cited_by':{'value':3}}],
                'serpapi_pagination':{'next':'https://example.com/never-follow-this'} if more else {}}

    @patch.object(u.requests,'Session')
    def test_api_pagination_preserves_metadata(self, session):
        client=session.return_value.__enter__.return_value
        client.get.side_effect=[Mock(json=lambda:self.payload(more=True)),Mock(json=lambda:self.payload('1'))]
        old={'publications':[{'title':'Paper 0','link':'https://scholar.google.com/citations?citation_for_view=TEST:0','url':'https://doi.org/10.example/test','abstract':'Preserve'}]}
        result=u.fetch_research_api('TEST','private-key',old)
        self.assertEqual(len(result['publications']),2)
        self.assertEqual(result['totalCitations'],1234)
        self.assertEqual(result['publications'][0]['abstract'],'Preserve')
        self.assertEqual(result['publications'][0]['url'],'https://doi.org/10.example/test')
        self.assertEqual(client.get.call_args.kwargs['params']['start'],1)
        self.assertEqual(client.get.call_args.args[0],'https://serpapi.com/search.json')

    @patch.object(u.requests,'Session')
    def test_api_error_does_not_leak_key(self, session):
        client=session.return_value.__enter__.return_value
        client.get.side_effect=requests.ConnectionError('URL includes private-key')
        with self.assertRaises(ValueError) as error:u.fetch_research_api('TEST','private-key')
        self.assertNotIn('private-key',str(error.exception))

    @patch.object(u.requests,'Session')
    def test_api_rejects_missing_metrics(self, session):
        payload=self.payload();del payload['cited_by']
        session.return_value.__enter__.return_value.get.return_value.json.return_value=payload
        with self.assertRaisesRegex(ValueError,'metrics are missing'):u.fetch_research_api('TEST','private-key')

    @patch.object(u.requests,'Session')
    def test_api_rejects_empty_and_repeated_pages(self, session):
        client=session.return_value.__enter__.return_value
        payload=self.payload();payload['articles']=[]
        client.get.return_value.json.return_value=payload
        with self.assertRaisesRegex(ValueError,'no articles'):u.fetch_research_api('TEST','private-key')
        client.get.side_effect=[Mock(json=lambda:self.payload(more=True)),Mock(json=lambda:self.payload())]
        with self.assertRaisesRegex(ValueError,'repeated'):u.fetch_research_api('TEST','private-key')

    @patch.dict(u.os.environ, {'SERPAPI_API_KEY':'private-key'})
    @patch.object(u,'fetch_research_api',return_value={'publications':[{}]})
    @patch.object(u,'fetch_research')
    def test_api_selected_without_touching_saved_data(self, direct, api):
        before=u.OUTPUT.read_bytes()
        self.assertEqual(u.main(['--dry-run']),0)
        api.assert_called_once();direct.assert_not_called()
        self.assertEqual(u.OUTPUT.read_bytes(),before)
