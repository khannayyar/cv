// Editorial themes are separate from the automatically refreshed Scholar record.
(async () => {
    const target = document.querySelector('[data-research-focus]');
    if (!target) return;
    const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const safeURL = value => {
        try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
        catch { return ''; }
    };
    try {
        const [focus, research, projects] = await Promise.all(['research-focus','research','projects'].map(async name => {
            const res = await fetch(`data/${name}.json`);
            if (!res.ok) throw new Error('Research highlights unavailable');
            return CVDateOrder.sortData(await res.json());
        }));
        const match = reference => research.publications.find(pub => pub.link === reference.link || pub.title === reference.title);
        const evidence = theme => CVDateOrder.newestFirst(theme.evidence.map(match).filter(Boolean)).map(pub => {
            const url = safeURL(pub.url || pub.link);
            return `<li>${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(pub.title)} ↗</a>` : escape(pub.title)}<span>${escape(pub.year || 'Year not listed')} · ${escape(pub.citations || 0)} citations</span></li>`;
        }).join('');
        const themes = focus.themes.map(theme => `<article class="focus-card" id="${escape(theme.id)}"><p class="eyebrow">PUBLISHED RESEARCH</p><h3>${escape(theme.title)}</h3><p>${escape(theme.summary)}</p><ul>${evidence(theme)}</ul></article>`).join('');
        let html = `<p class="eyebrow">RESEARCH FOCUS</p><h2>${escape(focus.title)}</h2><p class="focus-intro">${escape(focus.summary)}</p>`;
        if (target.dataset.researchFocus === 'projects') {
            const selected = projects.projects.filter(project => /healthcare|blockchain/i.test(project.category || ''));
            html += `<div class="focus-grid">${selected.map(project => `<article class="focus-card"><p class="eyebrow">${escape(project.category)}</p><h3>${escape(project.title)}</h3><p>${escape(project.description)}</p><a class="text-link" href="#projects-grid">View full project details ↓</a></article>`).join('')}</div><p class="focus-note">These are existing projects. The complete portfolio below preserves their original roles, dates, and reported outcomes.</p>`;
        } else {
            html += `<div class="focus-grid">${themes}</div>`;
            if (target.dataset.researchFocus === 'themes' && location.pathname.endsWith('research.html')) {
                html += `<div class="focus-directions"><h3>Next research directions</h3><p>Proposed directions building on the published work above.</p><div class="focus-grid">${focus.futureDirections.map(item => `<article><h4>${escape(item.title)}</h4><p>${escape(item.description)}</p></article>`).join('')}</div></div>`;
            }
            html += '<p class="focus-note">Healthcare applications are presented as computational research and technology development. Publication does not establish clinical validation or deployment. The full CV retains research in education, security, and other computing domains.</p>';
        }
        target.innerHTML = html;
    } catch (error) {
        target.innerHTML = '<p>Research highlights could not be loaded. <a class="text-link" href="publications.html">View the publication record ↗</a></p>';
    }
})();
