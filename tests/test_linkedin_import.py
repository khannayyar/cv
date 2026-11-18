"""A complete export must enrich public CV data without importing account activity."""
import contextlib
import csv
import importlib.util
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('linkedin_import',ROOT/'scripts/import_linkedin.py')
importer=importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)

class LinkedInImportTests(unittest.TestCase):
    def test_public_allowlist_merge_and_repeat_import(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            shutil.copytree(ROOT/'data',root/'data')
            (root/'docs').mkdir()
            before_education=json.loads((root/'data/education.json').read_text())
            before_experience=json.loads((root/'data/experience.json').read_text())
            before_recommendations=json.loads((root/'data/testimonials.json').read_text())
            archive=root/'export.zip'
            with zipfile.ZipFile(archive,'w') as z:
                def table(name,rows):
                    out=io.StringIO();writer=csv.DictWriter(out,fieldnames=list(rows[0]) if rows else ['Name']);writer.writeheader();writer.writerows(rows);z.writestr(name+'.csv',out.getvalue())
                for name in ['Profile','Positions','Education','Skills','Courses','Languages','Organizations','Volunteering','Honors','Certifications','Projects','Patents','Publications']:table(name,[])
                table('Learning',[{'Content Title':'Completed course fixture','Content Type':'Course','Content Completed At (if completed)':'2026-11-17 10:18 UTC'},{'Content Title':'Incomplete fixture','Content Type':'Course','Content Completed At (if completed)':'N/A'}])
                table('Recommendations_Received',[{'First Name':'Visible','Last Name':'Colleague','Company':'University','Job Title':'Faculty','Text':'Public recommendation fixture.','Creation Date':'11/17/26, 07:23 PM','Status':'VISIBLE'},{'First Name':'Hidden','Last Name':'Colleague','Company':'University','Job Title':'Faculty','Text':'Private draft fixture.','Creation Date':'11/17/26, 07:23 PM','Status':'HIDDEN'}])
                table('Endorsement_Received_Info',[{'Skill Name':'Testing','Endorsement Status':'ACCEPTED','Endorser First Name':'Private endorser fixture'},{'Skill Name':'Ignored','Endorsement Status':'PENDING','Endorser First Name':'Private endorser fixture'}])
                z.writestr('messages.csv','Private message fixture')
            def run():
                with patch.object(importer,'ROOT',root),patch.object(sys,'argv',['import',str(archive),'--source-date','2026-11-17']),contextlib.redirect_stdout(io.StringIO()):importer.main()
            run()
            profile=json.loads((root/'data/professional-profile.json').read_text())
            self.assertEqual(len([c for c in profile['courses'] if c['name']=='Completed course fixture']),1)
            self.assertFalse(any(c['name']=='Incomplete fixture' for c in profile['courses']))
            self.assertEqual(profile['skillEndorsements'],[{'name':'Testing','count':1,'asOf':'2026-11-17'}])
            recommendations=json.loads((root/'data/testimonials.json').read_text())['testimonials']
            self.assertEqual(len(recommendations),len(before_recommendations['testimonials'])+1)
            self.assertEqual(json.loads((root/'data/education.json').read_text()),before_education)
            self.assertEqual(json.loads((root/'data/experience.json').read_text()),before_experience)
            public=''.join(p.read_text() for p in (root/'data').glob('*.json'))
            for private in ['Private draft fixture','Private message fixture','Private endorser fixture']:self.assertNotIn(private,public)
            first={p.name:json.loads(p.read_text()) for p in (root/'data').glob('*.json')}
            run()
            self.assertEqual(first,{p.name:json.loads(p.read_text()) for p in (root/'data').glob('*.json')})

if __name__=='__main__':unittest.main()
