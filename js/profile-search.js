// Shared, deterministic retrieval for local search and server-side grounding.
const stop = new Set('a an the is are was were to of in on for and or with about me my his her him he she dr khan nayyar ahmed tell what how does do can you your i please profile more information details'.split(' '));
export function tokens(text) {
    return (String(text).toLowerCase().normalize('NFKD').match(/[\p{L}\p{N}]+/gu) || [])
        .map(word => word.length>4 && word.endsWith('s') ? word.slice(0,-1) : word).filter(word => word.length>1 && !stop.has(word));
}
export function searchProfile(question, records, limit=6) {
    const query = new Set(tokens(question));
    if (!query.size || (query.size===1 && query.has('who'))) ['professional','biography','research','focus'].forEach(term=>query.add(term));
    const expansions=[['education','qualification','degree','phd','doctor','philosophy','bachelor','master','studied'],['healthcare','health','medical','clinical','iomt'],['ai','artificial','intelligence','ml','machine','learning'],['blockchain','ledger','distributed'],['publication','paper','article','research'],['teaching','teach','course','instructor'],['experience','career','employment','faculty'],['certification','credential','certificate'],['contact','email','phone'],['citation','metric','index']];
    const expanded=new Set(query);
    expansions.forEach(group=>{if(group.some(term=>query.has(term)))group.forEach(term=>expanded.add(term));});
    const preferred=new Set();
    const intents=[
        [['education','qualification','degree','phd','doctor','bachelor','master','studied'],['education.html']],
        [['experience','career','employment'],['experience.html']],
        [['certification','credential','certificate'],['certifications.html','badges.html']],
        [['teaching','teach','taught','course','instructor'],['teaching.html']],
        [['contact','email','phone'],['contact.html']],
        [['publication','paper','article','citation','metric'],['publications.html']]
    ];
    intents.forEach(([terms,pages])=>{if(terms.some(term=>query.has(term)))pages.forEach(page=>preferred.add(page));});
    return records.map(record=>{
        const title=new Set(tokens(record.title)), body=tokens(record.text), bodySet=new Set(body);
        let score=0, matched=0;
        for(const term of expanded){
            const direct=query.has(term);
            if(title.has(term))score+=direct?9:2;
            if(bodySet.has(term)){score+=direct?3:0.65;if(direct)matched++;}
        }
        if(score>0 && preferred.has(record.page))score+=18;
        if(record.kind==='page')score*=0.45;
        score/=1+Math.log(1+body.length)/18;
        return {...record,score:score+matched*2};
    }).filter(record=>record.score>=2).sort((a,b)=>b.score-a.score).slice(0,limit);
}
