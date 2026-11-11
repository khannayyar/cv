"""Import an explicit allowlist of professional CSVs; never extract the archive."""
import argparse,csv,io,json,re,html,zipfile,difflib
from pathlib import Path
from datetime import datetime
ROOT=Path(__file__).resolve().parents[1]

def clean(s):return re.sub(r'\s+',' ',html.unescape(s or '')).strip()
def norm(s):return re.sub(r'[^a-z0-9]','',clean(s).lower())
def date(s):
    for fmt in ('%b %Y','%B %Y','%b %d, %Y','%Y-%m-%d','%Y'):
        try:return datetime.strptime(clean(s),fmt).strftime('%Y-%m-%d')
        except ValueError:pass
    return ''
def load(n):return json.loads((ROOT/'data'/f'{n}.json').read_text())
def save(n,d):(ROOT/'data'/f'{n}.json').write_text(json.dumps(d,ensure_ascii=False,indent=4)+'\n')
def url(s):
    s=clean(s)
    return s if re.match(r'^https?://[^\s]+$',s) and not re.search(r'://(?:10\.|192\.168\.|127\.|localhost)',s) else ''
def description(s):return re.sub(r'https?://\S+','',clean(s)).strip()
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('archive',type=Path);args=parser.parse_args()
    with zipfile.ZipFile(args.archive) as archive:
        def rows(name):
            info=archive.getinfo(name+'.csv')
            if info.file_size>5_000_000:raise ValueError('CSV exceeds size limit')
            return [{k:clean(v) for k,v in r.items()} for r in csv.DictReader(io.StringIO(archive.read(info).decode('utf-8-sig')))]
        # No messages, account records, connections, job applications or private contact data.
        datasets={n:rows(n) for n in ['Profile','Positions','Education','Skills','Courses','Languages','Organizations','Volunteering','Honors','Certifications','Projects','Patents','Publications']}
    conflicts=[];counts={}
    credentials=load('certifications');known={norm(x['name']) for x in credentials['certifications']}
    added=0
    for r in datasets['Certifications']:
        if norm(r['Name']) in known:continue
        credentials['certifications'].append({'name':r['Name'],'issuer':r['Authority'],'year':r['Started On'],'date':date(r['Started On']),'expirationDate':date(r['Finished On']),'url':url(r['Url']),'source':'LinkedIn export'})
        known.add(norm(r['Name']));added+=1
    save('certifications',credentials);counts['Certifications added']=added
    skills=load('skills');known={norm(s) for c in skills['categories'] for s in c['skills']}
    extra=[r['Name'] for r in datasets['Skills'] if norm(r['Name']) not in known]
    if extra:skills['categories'].append({'name':'Additional Professional Skills','skills':extra})
    save('skills',skills);counts['Skills added']=len(extra)
    professional={'source':'LinkedIn data export supplied 2026-11-11','languages':[{'name':r['Name'],'proficiency':r['Proficiency']} for r in datasets['Languages']], 'courses':[{'name':r['Name'],'provider':r['Number']} for r in datasets['Courses']], 'affiliations':[], 'service':[], 'publicationDetails':[]}
    for r in datasets['Organizations']:
        professional['affiliations'].append({'name':r['Name'],'role':r['Position'],'date':f"{r['Started On']} - {r['Finished On'] or 'Present'}" if r['Started On'] else '', 'description':description(r['Description']),'url':url(r['Description'])})
    for r in datasets['Volunteering']:
        professional['service'].append({'title':r['Role'],'organization':r['Company Name'],'date':f"{r['Started On']} - {r['Finished On'] or 'Present'}" if r['Started On'] else '', 'description':description(r['Description']),'url':url(r['Description'])})
    awards=load('awards');added=0
    for r in datasets['Honors']:
        issued=date(r['Issued On']);exists=any(date(a.get('date',''))==issued and (norm(a['title']) in norm(r['Title']) or difflib.SequenceMatcher(None,norm(a['title']),norm(r['Title'])).ratio()>.56) for a in awards['awards'])
        if 'googlehashcode' in norm(r['Title']) and any('googlehashcode' in norm(a['title']) and r['Issued On'][-4:] in a.get('date','') for a in awards['awards']):exists=True
        if any(norm(a['title'])==norm(r['Title']) and a.get('date')==r['Issued On'] for a in awards['awards']):exists=True
        if not exists:
            awards['awards'].append({'title':r['Title'],'issuer':'','date':r['Issued On'],'description':description(r['Description']),'icon':'fas fa-award','color':'blue','source':'LinkedIn export'});added+=1
    save('awards',awards);counts['Honors and service recognitions added']=added
    education=load('education')
    for r in datasets['Education']:
        degree=next((x for x in education['degrees'] if ('Doctor' in r['Degree Name'] and 'Doctor' in x['degree']) or ('Master' in r['Degree Name'] and 'Master' in x['degree']) or ('Bachelor' in r['Degree Name'] and 'Bachelor' in x['degree'])),None)
        if not degree:continue
        if r['Start Date'] and degree.get('year')=='Completed':
            degree['year']=f"{r['Start Date']} - {r['End Date']}";degree['source']='LinkedIn export (dates)'
        if not degree.get('institutionConfirmedByUser') and norm(r['School Name']) not in norm(degree['institution']):
            conflicts.append(f"Education: LinkedIn lists {r['School Name']} for {r['Degree Name']}; existing institution retained: {degree['institution']}.")
    save('education',education)
    projects=load('projects');added=0
    aliases={'supmsanawardwinningsystemanditsworkingprincipals':'projectmanagementsystempmsatcollegeofcomputingandit','pubrepoaprivaterepositoryforpublications':'dspacepublicationrepositorysysteminuniversityenvironment','medidroneadronebasedemergencyservicesystem':'medidronedronebasedemergencyservicesystemforsaudihealthcare','blockchainmodel':'blockchainbaseddigitallysecuredmodelforeducationalsector','amsccit':'studentabsencemanagementsystem','dropandaddcoursesystemautomation':'courseadddropmanagementsystem','covid19advisingapplicationdevelopmentforappledevicesios':'covid19advisingapplicationforappledevicesios'}
    for r in datasets['Projects']:
        key=aliases.get(norm(r['Title']),norm(r['Title']))
        existing=next((x for x in projects['projects'] if norm(x['title'])==key or difflib.SequenceMatcher(None,norm(x['title']),key).ratio()>.9),None)
        timeline=f"{r['Started On']} - {r['Finished On'] or 'Present'}" if r['Started On'] else ''
        if existing:
            existing['linkedinTimeline']=timeline
            if timeline:
                existing['duration']=timeline
                existing['timelineDate']=timeline
                existing['status']='Completed' if r['Finished On'] else 'Ongoing'
        else:
            projects['projects'].append({'title':r['Title'],'role':'Contributor (role not specified in export)','duration':timeline,'status':'Completed' if r['Finished On'] else 'Ongoing','category':'Professional Projects','technologies':[],'description':description(r['Description']) or 'Project listed in the professional profile.','outcomes':[],'link':url(r['Url']),'source':'LinkedIn export'});added+=1
    save('projects',projects);counts['Projects added']=added
    patents=load('patents');added=0
    for r in datasets['Patents']:
        number=re.sub(r'[^0-9]','',r['Patent Number'] or r['Issuer'])
        existing=next((p for p in patents['patents'] if (number and re.sub(r'[^0-9]','',p.get('patentNumber',''))==number) or norm(p['title'])==norm(r['Title']) or difflib.SequenceMatcher(None,norm(p['title']),norm(r['Title'])).ratio()>.92),None)
        issued=date(r['Issued On'])
        if existing:
            if issued and existing.get('grantDate','').endswith('-12-31'):
                existing['grantDate']=issued;existing['source']='LinkedIn export (issue date)'
        else:
            patents['patents'].append({'id':max(p['id'] for p in patents['patents'])+1,'title':r['Title'],'patentNumber':r['Patent Number'] or r['Issuer'],'status':'Issued','grantDate':issued,'filingDate':date(r['Filed On']),'country':'Not specified','inventors':[],'abstract':description(r['Description']),'links':{'patent':url(r['Url'])},'tags':[],'featured':False,'source':'LinkedIn export'});added+=1
    save('patents',patents);counts['IP records added']=added
    research=load('research');matched=0
    for r in datasets['Publications']:
        key=norm(r['Name']);ranked=sorted(((difflib.SequenceMatcher(None,key,norm(p['title'])).ratio(),p) for p in research['publications']),key=lambda x:x[0],reverse=True)
        match=ranked[0][1] if ranked and ranked[0][0]>=.94 else None
        item={'title':r['Name'],'date':date(r['Published On']),'publisher':r['Publisher'],'description':r['Description'],'url':url(r['Url']),'matchedScholarLink':match.get('link','') if match else ''}
        professional['publicationDetails'].append(item)
        if match:
            if item['url']:match['url']=item['url']
            if description(r['Description']):match['abstract']=description(r['Description'])
            match['linkedinPublishedOn']=item['date'];matched+=1
            if item['date'] and match.get('year') and item['date'][:4]!=match['year']:conflicts.append(f"Publication date: {match['title']} — Scholar year {match['year']}, LinkedIn date {item['date']}. Scholar year retained.")
    save('research',research);save('professional-profile',professional);counts['Publication records enriched']=matched;counts['Supplementary publication records']=len(datasets['Publications'])-matched
    counts['Languages']=len(professional['languages']);counts['Service roles']=len(professional['service']);counts['Affiliations']=len(professional['affiliations'])
    counts['Credentials in website']=len(credentials['certifications'])
    counts['Projects in website']=len(projects['projects'])
    counts['IP records in website']=len(patents['patents'])
    (ROOT/'docs'/'linkedin-import-report.md').write_text('# LinkedIn professional-data import\n\nOnly professional CSV fields were imported. Private account, contact, messaging, invitation and job-search records were excluded. The archive is not copied into the website. Profile name, research positioning and existing job history were retained. Credential identifiers were omitted; public verification URLs were retained. Blank end dates in dated service and affiliation records are displayed as Present, as listed in the supplied profile; no independent status verification was performed.\n\n'+ '\n'.join(f'- {k}: {v}' for k,v in counts.items())+'\n\n## Differences retained for review\n\n'+'\n'.join('- '+s for s in conflicts)+'\n')
    print(json.dumps(counts))
if __name__=='__main__':main()
