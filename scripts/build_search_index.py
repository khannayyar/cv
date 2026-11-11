"""Build a public, source-linked search index from CV JSON and page content."""
import hashlib,json,re
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]

class PageText(HTMLParser):
    def __init__(self):
        super().__init__();self.skip=0;self.parts=[]
    def handle_starttag(self,tag,attrs):
        if tag in ('head','script','style','nav','footer'):self.skip+=1
    def handle_endtag(self,tag):
        if tag in ('head','script','style','nav','footer'):self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if not self.skip:self.parts.append(data)

def human(key):return re.sub(r'([A-Z])',r' \1',key)

def plain(value):
    if isinstance(value,list):return '; '.join(filter(None,(plain(v) for v in value)))
    if isinstance(value,dict):
        return '; '.join(f'{human(k)}: {plain(v)}' for k,v in value.items()
                        if k not in {'url','link','links','photo','icon','color','source','matchedScholarLink','institutionConfirmedByUser','linkedinTimeline'} and v not in ('',None,[],{}))
    return str(value)

def build_index():
    records=[]
    def add(title,text,page,kind="record"):
        text=re.sub(r'\s+',' ',text).strip()
        if not text:return
        records.append({'id':hashlib.sha256((page+'|'+title+'|'+text).encode()).hexdigest()[:16], 'title':title,'text':text[:4000],'page':page,'kind':kind})
    def load(name):return json.loads((ROOT/'data'/f'{name}.json').read_text())
    info=load('personal-info')
    add('Professional biography and research focus',info['name']+'. '+info.get('bio','')+' '+info.get('researchHeadline',''),'about.html')
    add('Public contact information',plain({k:info.get(k) for k in ('name','title','department','university','email','phone','address','officeHours')}),'contact.html')
    add('Research interests and professional expertise',plain({k:info.get(k) for k in ('researchInterests','professionalExpertise')}),'research.html')
    research=load('research')
    add('Publications and citation metrics',f"Profile last updated: {research.get('lastUpdated')}. Publications: {len(research['publications'])}. Citations: {research.get('totalCitations')}. h-index: {research.get('hIndex')}. i10-index: {research.get('i10Index')}.",'publications.html')
    groups=[('education','degrees','education.html'),('experience','positions','experience.html'),('projects','projects','projects.html'),('research','publications','publications.html'),('awards','awards','awards.html'),('patents','patents','patents.html'),('certifications','certifications','certifications.html'),('certifications','featuredRoles','certifications.html'),('skills','categories','skills.html'),('community','contributions','community.html'),('badges','badges','badges.html'),('testimonials','testimonials','testimonials.html'),('organizations','organizations','certifications.html'),('professional-profile','languages','about.html'),('professional-profile','service','community.html'),('professional-profile','affiliations','experience.html'),('professional-profile','courses','teaching.html')]
    for name,key,page in groups:
        for item in load(name).get(key,[]):
            title=item.get('title') or item.get('degree') or item.get('name') or item.get('role') or name
            add(title,plain(item),page)
    for group in load('teaching').get('years',[]):
        for course in group.get('courses',[]):add(course['title']+' — '+group['academicYear'],plain(course)+'; academic year: '+group['academicYear'],'teaching.html')
    for name,page in [('philosophy','teaching.html'),('research_philosophy','research.html')]:
        add(load(name).get('title',name),plain(load(name)),page)
    for page in ROOT.glob('*.html'):
        parser=PageText();parser.feed(page.read_text())
        text=re.sub(r'\s+',' ',' '.join(parser.parts)).replace('Skip to content','').strip()
        for index in range(0,len(text),1800):add(page.stem.title()+' page',text[index:index+1800],page.name,kind='page')
    return {'version':1,'records':records}

def write_index():
    result=build_index();path=ROOT/'data'/'search-index.json'
    path.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    return result

if __name__=='__main__':print(f"Indexed {len(write_index()['records'])} public profile records.")
