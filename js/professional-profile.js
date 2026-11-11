/* Public professional fields from the user-supplied LinkedIn export. */
(async () => {
    const container = document.querySelector('[data-professional-profile]');
    if (!container) return;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const link = value => { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? esc(u.href) : ''; } catch { return ''; } };
    try {
        const [profile, certs, skills] = await Promise.all(['professional-profile','certifications','skills'].map(async name => {
            const res = await fetch(`data/${name}.json`); if (!res.ok) throw new Error('Unavailable');
            return CVDateOrder.sortData(await res.json());
        }));
        const mode = container.dataset.professionalProfile;
        let title = '', intro = '', items = [], type = 'cards';
        if (mode === 'about') {
            title='Languages & professional development'; intro='Language proficiency and completed professional-development courses listed in my professional profile.';
            items=[...profile.languages.map(x => ({title:x.name,description:x.proficiency})),...profile.courses.map(x => ({title:x.name,description:x.provider || 'Professional-development course'}))];
        } else if (mode === 'credentials') {
            title='Certifications & professional credentials';intro='Dated credentials with public verification links where supplied. Issue dates record when credentials were earned; they do not establish current validity.';
            items=certs.certifications.map(x=>({title:x.name,organization:x.issuer,date:x.date || x.year,description:x.expirationDate ? `Expiration date listed: ${x.expirationDate}` : '',url:x.url}));
        } else if (mode === 'service') {
            title='Professional service & volunteering';intro='Editorial service, academic technology leadership, training, and community contributions.';items=profile.service;
        } else if (mode === 'affiliations') {
            title='Academic affiliations & scholarly service';intro='Additional professional affiliations and responsibilities alongside my employment history.';
            items=[...profile.affiliations.map(x=>({...x,title:x.role,organization:x.name})),...profile.service.filter(x=>/editor/i.test(x.title))];items=CVDateOrder.newestFirst(items);
        } else if (mode === 'courses') {
            title='Professional learning & trainer development';intro='Courses and development activities completed by me, separate from the university courses I teach.';items=profile.courses.map(x=>({title:x.name,organization:x.provider}));
        } else if (mode === 'skills') {
            title='Additional professional capabilities';intro='Skills listed in my professional profile, complementing the research and technical expertise above.';
            items=(skills.categories.find(x=>x.name==='Additional Professional Skills')?.skills || []).map(x=>({title:x}));
        } else if (mode === 'publications') {
            title='Publication descriptions & publisher links';intro='Publication descriptions supplied in the professional profile. LinkedIn dates are shown separately from Scholar years where they differ. This catalog supplements the Scholar record; it does not change citation totals.';
            items=profile.publicationDetails;type='details';
        } else if (mode === 'home') {
            title='A wider professional perspective';intro='Professional credentials, scholarly service, and a multilingual academic background.';
            items=[{title:`${certs.certifications.length} professional credentials`,description:'Explore certifications across AI, cloud, data, security, and professional skills.',url:'certifications.html'},{title:'Editorial & academic service',description:'Associate editor, journal reviewer, academic technology leadership, and community contributions.',url:'community.html'},{title:`${profile.languages.length} languages`,description:profile.languages.map(x=>x.name).join(' · '),url:'about.html'}];
        }
        const isHome = mode === 'home';
        const urlFor = value => isHome && /^[a-z-]+\.html$/.test(value || '') ? value : link(value);
        container.innerHTML=`<p class="eyebrow">PROFESSIONAL PROFILE</p><h2>${esc(title)}</h2><p class="focus-intro">${esc(intro)}</p>${items.length>8 ? '<label class="profile-search-label">Search this section<input type="search" class="profile-search" placeholder="Search by title, organization, or keyword"></label><p class="profile-count" aria-live="polite"></p>' : ''}<div class="${type==='details'?'profile-publications':'focus-grid'}"></div><p class="profile-empty" hidden>No matching items.</p>`;
        const grid=container.querySelector('.focus-grid, .profile-publications');
        function render(query='') {
            const filtered=items.filter(x=>[x.title,x.organization,x.publisher,x.description].join(' ').toLowerCase().includes(query.toLowerCase()));
            const count=container.querySelector('.profile-count');if(count) count.textContent=`${filtered.length} of ${items.length} items`;
            container.querySelector('.profile-empty').hidden=filtered.length>0;
            grid.innerHTML=filtered.map(x=>{
                const url=urlFor(x.url);
                const meta=[x.organization || x.publisher,x.date].filter(Boolean).join(' · ');
                const content=`<p class="profile-meta">${esc(meta)}</p>${x.description?`<p class="profile-description">${esc(x.description)}</p>`:''}${url?`<a class="text-link" href="${url}" ${isHome?'':'target="_blank" rel="noopener noreferrer"'}>${type==='details'?'Publisher / publication':'View details'} ↗</a>`:''}`;
                return type==='details'?`<details class="profile-publication"><summary>${esc(x.title)}</summary>${content}</details>`:`<article class="focus-card"><h3>${esc(x.title)}</h3>${content}</article>`;
            }).join('');
        }
        render();container.querySelector('.profile-search')?.addEventListener('input',event=>render(event.target.value));
    } catch { container.innerHTML='<p>Additional profile information could not be loaded. Please refresh to try again.</p>'; }
})();
