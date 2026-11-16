import json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class CaseStudyTests(unittest.TestCase):
    def test_all_case_studies_reference_documented_projects(self):
        data=json.loads((ROOT/'data/case-studies.json').read_text())
        projects={p['title']:p for p in json.loads((ROOT/'data/projects.json').read_text())['projects']}
        self.assertEqual(len(data['caseStudies']),3)
        self.assertEqual(len({s['id'] for s in data['caseStudies']}),3)
        for study in data['caseStudies']:
            project=projects[study['projectTitle']]
            self.assertTrue(project['role'])
            self.assertTrue(project['duration'])
            self.assertTrue(project['link'].startswith('https://'))
            for key in ['problem','approach','contribution','outcome','evidenceNote','nextQuestion']:
                self.assertTrue(study[key])
    def test_collaboration_topics_are_proposals(self):
        topics=json.loads((ROOT/'data/case-studies.json').read_text())['collaboration']
        self.assertEqual(len(topics),3)
        for topic in topics:self.assertTrue(topic['proposal'].startswith('Potential joint work:'))
