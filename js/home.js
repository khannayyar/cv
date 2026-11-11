const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function paperURL(value) {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
}
async function loadHomeResearch() {
    const container = document.getElementById('home-publications');
    try {
        const response = await fetch('data/research.json');
        if (!response.ok) throw new Error('Research data unavailable');
        const data = CVDateOrder.sortData(await response.json());
        const publications = Array.isArray(data.publications) ? data.publications : [];
        document.querySelectorAll('[data-home-metric]').forEach(el => {
            const key = el.dataset.homeMetric;
            const value = key === 'publications' ? publications.length : data[key];
            el.textContent = Number.isFinite(value) ? value.toLocaleString('en-US') : '—';
        });
        document.getElementById('scholar-updated').textContent = data.lastUpdated ? `Last successful update: ${data.lastUpdated}` : 'Saved research profile';
        const sorted = CVDateOrder.newestFirst(publications);
        let recent = sorted.slice(0, 4);
        try {
            const focusRes = await fetch('data/research-focus.json');
            if (focusRes.ok) {
                const focus = await focusRes.json();
                const selected = (focus.featuredPublications || []).map(ref => publications.find(pub => pub.link === ref.link || pub.title === ref.title)).filter(Boolean);
                if (selected.length) recent = CVDateOrder.newestFirst(selected).slice(0, 4);
            }
        } catch { /* Keep the latest saved publications if editorial highlights are unavailable. */ }
        container.innerHTML = recent.map(pub => {
            const url = paperURL(pub.url || pub.link);
            const title = escapeHTML(pub.title);
            return `<article class="publication-row"><span class="pub-year">${escapeHTML(pub.year || '—')}</span><div><h3>${url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${title} ↗</a>` : title}</h3><p>${escapeHTML(pub.authors)}</p><p>${escapeHTML(pub.journal)}</p></div><div class="pub-citations"><span>${escapeHTML(pub.citations || 0)}</span>citations</div></article>`;
        }).join('') || '<p>No publications are available yet. <a class="text-link" href="publications.html">View research profile ↗</a></p>';
    } catch (error) {
        container.innerHTML = '<p>Publications could not be loaded. <a class="text-link" href="https://scholar.google.com/citations?user=A0nTCiwAAAAJ">Visit Google Scholar ↗</a></p>';
        document.getElementById('scholar-updated').textContent = 'Saved profile temporarily unavailable';
    }
}
loadHomeResearch();
fetch('data/personal-info.json').then(r => { if (!r.ok) throw new Error('Unavailable'); return r.json(); }).then(data => {
    const roles = data.trainerHighlights;
    if (Array.isArray(roles) && roles.length) document.getElementById('home-trainers').innerHTML = roles.map(role => `<li>${escapeHTML(role)}</li>`).join('');
}).catch(() => {});
