(async () => {
    const target=document.getElementById('featured-contributions');if(!target)return;
    const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    try{
        const [cases,projects]=await Promise.all(['case-studies','projects'].map(async name=>{const response=await fetch(`data/${name}.json`);if(!response.ok)throw new Error('Unavailable');return response.json();}));
        const selected=cases.caseStudies.map(study=>({study,project:projects.projects.find(p=>p.title===study.projectTitle)})).filter(item=>item.project);
        selected.sort((a,b)=>CVDateOrder.compare(a.project,b.project));
        target.innerHTML=selected.map(({study,project})=>`<article class="contribution-card"><p class="eyebrow">${esc(study.theme)}</p><h3>${esc(study.title)}</h3><p class="contribution-meta">${esc(project.role)} · ${esc(project.duration)}</p><dl><dt>The challenge</dt><dd>${esc(study.problem)}</dd><dt>Reported outcome</dt><dd>${esc(study.outcome)}</dd></dl><a class="text-link" href="case-studies.html#${esc(study.id)}">Read the full case study ↗</a></article>`).join('');
    }catch{target.innerHTML='<p><a class="text-link" href="projects.html">Explore the project portfolio ↗</a></p>';}
})();
