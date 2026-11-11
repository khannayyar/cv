(async () => {
    const target = document.getElementById('featured-contributions');
    if (!target) return;
    const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const evidenceURL = value => { try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? escape(url.href) : ''; } catch { return ''; } };
    const briefs = [
        {match:'NAMAQ',problem:'Recognizing Arabic handwriting across character shapes and writing styles.',outcome:'Reported 96.4% recognition across 29 Arabic character classes.',label:'Applied machine learning'},
        {match:'COVID-19 Advising Application',problem:'Making symptom-related health information accessible through a mobile interface.',outcome:'Developed an NLP-based iOS advisory application, documented in a research publication.',label:'Healthcare computing'},
        {match:'Blockchain-Based Digitally Secured',problem:'Verifying academic credentials while addressing document fraud.',outcome:'Developed a blockchain-based academic certificate verification model.',label:'Blockchain & digital trust'}
    ];
    try {
        const response=await fetch('data/projects.json');if(!response.ok)throw new Error('Unavailable');
        const data=await response.json();
        const selected=briefs.map(brief=>({brief,project:data.projects.find(p=>p.title.includes(brief.match))})).filter(x=>x.project);
        selected.sort((a,b)=>CVDateOrder.compare(a.project,b.project));
        target.innerHTML=selected.map(({brief,project})=>`<article class="contribution-card"><p class="eyebrow">${escape(brief.label)}</p><h3>${escape(project.title)}</h3><p class="contribution-meta">${escape(project.role)} · ${escape(project.duration || 'Date not listed')}</p><dl><dt>The challenge</dt><dd>${escape(brief.problem)}</dd><dt>My contribution</dt><dd>${escape(project.description)}</dd><dt>Reported outcome</dt><dd>${escape(brief.outcome)}</dd></dl><a class="text-link" href="${evidenceURL(project.link) || 'projects.html'}" ${evidenceURL(project.link) ? 'target="_blank" rel="noopener noreferrer"' : ''}>Read supporting publication ↗</a></article>`).join('');
    } catch {target.innerHTML='<p><a class="text-link" href="projects.html">Explore the project portfolio ↗</a></p>';}
})();
