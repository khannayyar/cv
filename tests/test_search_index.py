import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('search_builder',ROOT/'scripts/build_search_index.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
class SearchIndexTests(unittest.TestCase):
    def test_sources_are_real_local_pages_and_stable(self):
        first=builder.build_index();second=builder.build_index()
        self.assertEqual(first,second)
        ids=[r['id'] for r in first['records']]
        self.assertEqual(len(ids),len(set(ids)))
        for r in first['records']:
            self.assertTrue((ROOT/r['page']).is_file())
            self.assertTrue(r['text'])
    def test_confirmed_education_and_metrics_are_indexed(self):
        records=builder.build_index()['records'];text=' '.join(r['text'] for r in records)
        self.assertIn('Himalayan University',text)
        self.assertIn('Shri Vaishnav Vidyapeeth Vishwavidyalaya',text)
        self.assertTrue(any(r['title']=='Publications and citation metrics' and 'Profile last updated:' in r['text'] for r in records))
    def test_navigation_and_scripts_are_not_page_evidence(self):
        parser=builder.PageText();parser.feed('<nav>Navigation</nav><script>secretCode()</script><h1>Public heading</h1>')
        self.assertEqual(' '.join(parser.parts),'Public heading')
