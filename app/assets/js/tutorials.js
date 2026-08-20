(() => {
  const catalog = document.querySelector('[data-tutorial-catalog]');
  if (!catalog) return;

  const search = catalog.querySelector('[data-tutorial-search]');
  const cards = [...catalog.querySelectorAll('[data-tutorial-grid] [data-tutorial-card]')];
  const count = catalog.querySelector('[data-visible-count]');
  const empty = catalog.querySelector('[data-tutorial-empty]');
  const reset = catalog.querySelector('[data-reset-filters]');
  const filters = { product: 'all', level: 'all' };

  const applyFilters = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;

    cards.forEach((card) => {
      const matchesSearch = !query || card.dataset.search.includes(query);
      const matchesProduct = filters.product === 'all' || card.dataset.product === filters.product;
      const matchesLevel = filters.level === 'all' || card.dataset.level === filters.level;
      const show = matchesSearch && matchesProduct && matchesLevel;

      card.hidden = !show;
      if (show) visible += 1;
    });

    count.textContent = visible;
    empty.hidden = visible !== 0;
  };

  const activate = (buttons, activeButton) => {
    buttons.forEach((button) => {
      const active = button === activeButton;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  catalog.querySelectorAll('[data-filter-group]').forEach((group) => {
    const buttons = [...group.querySelectorAll('[data-filter-value]')];
    buttons.forEach((button) => button.addEventListener('click', () => {
      filters[group.dataset.filterGroup] = button.dataset.filterValue;
      activate(buttons, button);
      applyFilters();
    }));
  });

  search.addEventListener('input', applyFilters);
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== search && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      event.preventDefault();
      search.focus();
    }
  });

  reset.addEventListener('click', () => {
    search.value = '';
    filters.product = 'all';
    filters.level = 'all';
    catalog.querySelectorAll('[data-filter-value="all"]').forEach((button) => {
      const group = button.closest('[data-filter-group]');
      activate([...group.querySelectorAll('button')], button);
    });
    applyFilters();
    search.focus();
  });
})();