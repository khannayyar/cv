// Initialize AOS (Animate On Scroll)
AOS.init({
    duration: 700,
    once: true,
    offset: 80,
    easing: 'ease-out-cubic'
});

// Mobile menu toggle (guarded for pages without mobile menu)
const mobileBtn = document.getElementById('mobile-menu-button');
if (mobileBtn) {
    mobileBtn.addEventListener('click', function() {
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) mobileMenu.classList.toggle('hidden');
    });
}

// Scroll progress bar
window.addEventListener('scroll', function() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const pb = document.getElementById('progressBar');
    if (pb) pb.style.width = scrolled + '%';
});

// Counter animation for statistics
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Trigger counter animation when section is in view
const observerOptions = {
    threshold: 0.5
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll('[data-count]');
            counters.forEach(counter => {
                if (counter.textContent === '0') {
                    animateCounter(counter);
                }
            });
        }
    });
}, observerOptions);

const highlightsSection = document.getElementById('highlights');
if (highlightsSection) {
    observer.observe(highlightsSection);
}

// Load dynamic counts for Academic Highlights from JSON data
async function loadHighlightsStats() {
    const pubsEl = document.querySelector('#highlights h3[data-metric="publications"]');
    const citsEl = document.querySelector('#highlights h3[data-metric="citations"]');
    const projEl = document.querySelector('#highlights h3[data-metric="projects"]');
    const awdEl  = document.querySelector('#highlights h3[data-metric="awards"]');
    const patEl  = document.querySelector('#highlights h3[data-metric="patents"]');
    const comEl  = document.querySelector('#highlights h3[data-metric="community"]');
    const trainerEl = document.querySelector('#highlights h3[data-metric="trainerRoles"]');
    if (!pubsEl && !citsEl && !projEl && !awdEl && !patEl && !comEl && !trainerEl) return;

    try {
        const [researchRes, awardsRes, projectsRes, patentsRes, communityRes, certificationsRes] = await Promise.all([
            fetch('data/research.json').then(r => r.ok ? r.json() : { publications: [], totalCitations: 0 }),
            fetch('data/awards.json').then(r => r.ok ? r.json() : { awards: [] }).catch(() => ({ awards: [] })),
            fetch('data/projects.json').then(r => r.ok ? r.json() : { projects: [] }).catch(() => ({ projects: [] })),
            fetch('data/patents.json').then(r => r.ok ? r.json() : { patents: [] }).catch(() => ({ patents: [] })),
            fetch('data/community.json').then(r => r.ok ? r.json() : { contributions: [] }).catch(() => ({ contributions: [] })),
            fetch('data/certifications.json').then(r => r.ok ? r.json() : { featuredRoles: [] }).catch(() => ({ featuredRoles: [] }))
        ]);

        const publications = Array.isArray(researchRes.publications) ? researchRes.publications.length : 0;
        const citations = Number.isFinite(researchRes.totalCitations)
            ? researchRes.totalCitations
            : (Array.isArray(researchRes.publications)
                ? researchRes.publications.reduce((sum, p) => sum + (parseInt(p.citations) || 0), 0)
                : 0);
        const awards = Array.isArray(awardsRes.awards) ? awardsRes.awards.length : 0;
        const projects = Array.isArray(projectsRes.projects) ? projectsRes.projects.length : 0;
        const patents = Array.isArray(patentsRes.patents) ? patentsRes.patents.length : 0;
    const community = Array.isArray(communityRes.contributions) ? communityRes.contributions.length : 0;
    const trainerRoles = Array.isArray(certificationsRes.featuredRoles) ? certificationsRes.featuredRoles.length : 0;

        function setCount(el, value) {
            if (!el) return;
            el.setAttribute('data-count', String(value));
            if (el.textContent !== '0') el.textContent = '0';
        }

        setCount(pubsEl, publications);
        setCount(citsEl, citations);
        setCount(projEl, projects);
        setCount(awdEl, awards);
        setCount(patEl, patents);
    setCount(comEl, community);
    setCount(trainerEl, trainerRoles);
    } catch (err) {
        console.warn('Failed to load highlight stats:', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHighlightsStats);
} else {
    loadHighlightsStats();
}

// Dynamic active navigation highlighting using data-nav anchors
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('a[data-nav]');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            // Add active styling if not already present
            link.classList.add('text-purple-600', 'font-semibold');
            // Also tint the trigger button but don't force dropdown panel to remain open
            const dropdown = link.closest('.group');
            if (dropdown) {
                const trigger = dropdown.querySelector('button');
                if (trigger) trigger.classList.add('text-purple-600', 'font-semibold');
            }
        }
    });
}

setActiveNavLink();

// Utilities to manage dropdown visibility
function closeDropdown(panel) {
    if (!panel) return;
    panel.classList.remove('visible','opacity-100');
    panel.classList.add('invisible','opacity-0');
    const trigger = panel.parentElement?.querySelector('button');
    if (trigger) trigger.setAttribute('aria-expanded','false');
}

function closeAllDropdowns(exceptPanel = null) {
    document.querySelectorAll('.group > div').forEach(panel => {
        if (panel !== exceptPanel && panel.classList.contains('visible')) {
            closeDropdown(panel);
        }
    });
}

// Auto-hide hover dropdowns immediately after clicking a link inside them
document.addEventListener('click', function(e) {
    const link = e.target.closest('a[data-nav]');
    if (!link) return;
    const dropdownPanel = link.closest('.group')?.querySelector('div');
    if (dropdownPanel) closeDropdown(dropdownPanel); // hide immediately regardless of state
});

// Close any open dropdown when clicking outside of dropdown areas
document.addEventListener('click', function(e) {
    const withinDropdown = e.target.closest('.group');
    if (!withinDropdown) {
        closeAllDropdowns();
    }
});

// Accessibility: manage aria-expanded on dropdown triggers and support ESC to close
function initDropdownAccessibility() {
    document.querySelectorAll('.group > button').forEach(btn => {
        const panel = btn.parentElement.querySelector('div');
        if (!panel) return;
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', panel.classList.contains('visible') ? 'true' : 'false');
        // Toggle on click for keyboard users
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = panel.classList.contains('visible');
            panel.classList.toggle('visible', !isOpen);
            panel.classList.toggle('opacity-100', !isOpen);
            panel.classList.toggle('invisible', isOpen);
            panel.classList.toggle('opacity-0', isOpen);
            btn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.group > div.visible').forEach(panel => {
                panel.classList.remove('visible','opacity-100');
                panel.classList.add('invisible','opacity-0');
                const trigger = panel.parentElement.querySelector('button');
                if (trigger) trigger.setAttribute('aria-expanded','false');
            });
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDropdownAccessibility);
} else {
    initDropdownAccessibility();
}

// Load recent publications on home page
async function loadRecentPublications() {
    const container = document.getElementById('publications-container');
    if (!container) return;
    
    try {
        const response = await fetch('data/research.json');
        const data = await response.json();
        
        // Get the 3 most recent publications
        const recentPubs = data.publications.slice(0, 3);
        
        container.innerHTML = recentPubs.map((pub, index) => `
            <div class="bg-white rounded-xl shadow-lg p-6 card-hover" data-aos="fade-up" data-aos-delay="${index * 100}">
                <h3 class="text-xl font-bold text-gray-800 mb-2">${pub.title}</h3>
                <p class="text-gray-600 mb-3">${pub.authors}</p>
                <p class="text-purple-600 font-medium mb-2">${pub.journal}, ${pub.year}</p>
                <div class="flex flex-wrap gap-4 items-center text-sm text-gray-500">
                    <span><i class="fas fa-quote-right mr-1"></i> ${pub.citations} citations</span>
                    ${pub.doi ? `<a href="${pub.doi}" target="_blank" class="text-blue-600 hover:underline">
                        <i class="fas fa-external-link-alt mr-1"></i> View Publication
                    </a>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.log('Publications data not yet available');
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-book-open text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg">Publications will be automatically updated from Google Scholar</p>
            </div>
        `;
    }
}

// Load publications when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadRecentPublications);
} else {
    loadRecentPublications();
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Removed heavy parallax transform on hero to prevent layout shift
// If desired later, prefer lightweight background position shifts without transforming layout
// window.addEventListener('scroll', function() {
//     const scrolled = window.pageYOffset;
//     const hero = document.querySelector('.animated-gradient');
//     if (hero) {
//         hero.style.backgroundPosition = `center ${scrolled * 0.2}px`;
//     }
// });
