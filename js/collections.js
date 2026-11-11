// Compact initial lists, with every item still available to readers and filters.
(() => {
    const limit = 6;
    const selectors = '#projects-grid,#publications-list,#badges-grid,#contributions-container,#testimonials-grid,#awards-grid,.profile-section .focus-grid,.profile-publications';
    const initialized = new WeakSet();
    function attach(grid) {
        if (initialized.has(grid)) return;
        initialized.add(grid);
        let expanded = false;
        const controls = document.createElement('div');
        controls.className = 'collection-controls';
        const status = document.createElement('span');
        status.setAttribute('aria-live', 'polite');
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'button button-dark';
        if (!grid.id) grid.id = `collection-${document.querySelectorAll('.collection-controls').length + 1}`;
        button.setAttribute('aria-controls', grid.id);
        controls.append(status, button); grid.after(controls);
        function update() {
            const children = [...grid.children];
            controls.hidden = children.length <= limit;
            children.forEach((child, index) => child.classList.toggle('collection-hidden', !expanded && index >= limit));
            status.textContent = `Showing ${expanded ? children.length : Math.min(limit, children.length)} of ${children.length}`;
            button.textContent = expanded ? 'Show fewer ↑' : `View all ${children.length} ↓`;
            button.setAttribute('aria-expanded', String(expanded));
        }
        button.addEventListener('click', () => {
            expanded = !expanded; update();
            if (!expanded) grid.scrollIntoView({block:'start', behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
        });
        new MutationObserver(() => { expanded = false; update(); }).observe(grid, {childList:true});
        update();
    }
    function scan() { document.querySelectorAll(selectors).forEach(attach); }
    new MutationObserver(scan).observe(document.body, {childList:true, subtree:true});
    scan();
})();
