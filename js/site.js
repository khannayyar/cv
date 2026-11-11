// Navigation shared by every page; native details also work without JavaScript.
const menuButton = document.querySelector('.menu-toggle');
const siteMenu = document.getElementById('site-menu');
function closeMenu() {
    siteMenu?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
}
menuButton?.addEventListener('click', () => {
    const open = siteMenu.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
const page = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.site-menu a[data-nav]').forEach(a => {
    if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page');
});
const dropdowns = [...document.querySelectorAll('.nav-dropdown')];
dropdowns.forEach(item => item.addEventListener('toggle', () => {
    if (item.open) dropdowns.forEach(other => { if (other !== item) other.open = false; });
}));
document.addEventListener('click', e => {
    dropdowns.forEach(item => { if (!item.contains(e.target)) item.open = false; });
    if (!document.getElementById('navbar')?.contains(e.target)) closeMenu();
});
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const openDropdown = dropdowns.find(item => item.open);
    if (openDropdown) {
        openDropdown.open = false;
        openDropdown.querySelector('summary').focus();
    } else if (siteMenu?.classList.contains('is-open')) {
        closeMenu();
        menuButton.focus();
    }
});
window.matchMedia('(min-width: 1051px)').addEventListener('change', closeMenu);
document.querySelectorAll('[data-current-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
document.querySelectorAll('a[target="_blank"]').forEach(a => { a.rel = 'noopener noreferrer'; });
