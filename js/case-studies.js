(async () => {
    const list=document.getElementById('case-studies-list');
    const collaboration=document.querySelector('[data-collaboration-topics]');
    if(!list&&!collaboration)return;
    const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const safeURL=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?esc(url.href):'';}catch{return '';}};
    try {
        const response=await fetch('data/case-studies.json');if(!response.ok)throw new Error('Unavailable');
        const data=await response.json();
        if(collaboration)collaboration.innerHTML=data.collaboration.map(topic=>`<article class="focus-card"><p class="eyebrow">PROPOSED COLLABORATION</p><h3>${esc(topic.title)}</h3><p>${esc(topic.question)}</p><h4>Relevant foundation</h4><p>${esc(topic.foundation)}</p><h4>A possible starting point</h4><p>${esc(topic.proposal)}</p></article>`).join('');
        if(list){
            const projectsResponse=await fetch('data/projects.json');if(!projectsResponse.ok)throw new Error('Projects unavailable');
            const projects=(await projectsResponse.json()).projects;
            const studies=data.caseStudies.map(study=>({study,project:projects.find(project=>project.title===study.projectTitle)})).filter(item=>item.project);
            studies.sort((a,b)=>CVDateOrder.compare(a.project,b.project));
            document.getElementById('case-study-nav').innerHTML=studies.map(({study})=>`<a href="#${esc(study.id)}">${esc(study.theme)} ↓</a>`).join('');
            list.innerHTML=studies.map(({study,project},index)=>`<article class="case-detail" id="${esc(study.id)}"><div class="case-detail-heading"><p class="eyebrow">CASE STUDY ${String(index+1).padStart(2,'0')} · ${esc(study.theme)}</p><h2>${esc(study.title)}</h2><p>${esc(study.summary)}</p><div class="case-facts"><span><strong>Recorded role</strong>${esc(project.role)}</span><span><strong>Project timeline</strong>${esc(project.duration)}</span><span><strong>Project status</strong>${esc(project.status)}</span></div></div><div class="case-detail-grid"><div class="case-methods"><h3>The research problem</h3><p>${esc(study.problem)}</p><h3>Approach & methods</h3><ul>${study.approach.map(step=>`<li>${esc(step)}</li>`).join('')}</ul><h3>My documented contribution</h3><p>${esc(study.contribution)}</p></div><aside><div class="case-outcome"><p class="eyebrow">REPORTED OUTCOME</p><p>${esc(study.outcome)}</p></div><h3>What the evidence supports</h3><p>${esc(study.evidenceNote)}</p><h3>A question to take forward</h3><p>${esc(study.nextQuestion)}</p></aside></div><div class="case-evidence-links">${safeURL(project.link)?`<a class="button button-dark" href="${safeURL(project.link)}" target="_blank" rel="noopener noreferrer">Read the supporting publication ↗</a>`:''}<a class="text-link" href="projects.html">View the project portfolio ↗</a><a class="text-link" href="#collaborate">Explore collaboration interests ↓</a></div><p class="focus-note">Based on the existing CV project record. Project timelines follow the supplied LinkedIn export; a publication’s date may differ from the project timeline.</p></article>`).join('');
            if(!studies.length)list.innerHTML='<p>No matching project records are available. <a href="projects.html">View the project portfolio.</a></p>';
            // Fragment targets are rendered asynchronously; honor direct links after insertion.
            if(location.hash){const target=document.getElementById(location.hash.slice(1));await document.fonts.ready;target?.scrollIntoView({block:'start',behavior:'instant'});}
        }
    }catch{
        if(list)list.innerHTML='<p>Case studies could not be loaded. <a class="text-link" href="projects.html">View the project portfolio ↗</a></p>';
        if(collaboration&&!collaboration.querySelector('article'))collaboration.innerHTML='<p><a class="text-link" href="contact.html">Contact me about research collaboration ↗</a></p>';
    }
})();
