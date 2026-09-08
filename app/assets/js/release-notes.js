(() => {
  const sections = [...document.querySelectorAll('.release-note')];
  const links = [...document.querySelectorAll('[data-release-link]')];

  if (!sections.length || !links.length) return;

  const setActiveRelease = (releaseId) => {
    links.forEach((link) => {
      const isActive = link.dataset.releaseLink === releaseId;
      link.classList.toggle('is-active', isActive);

      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const updateActiveRelease = () => {
    const topOffset = (document.querySelector('.learn-topbar')?.offsetHeight || 72) + 48;
    let activeSection = sections[0];

    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= topOffset) activeSection = section;
    });

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      activeSection = sections[sections.length - 1];
    }

    setActiveRelease(activeSection.id);
  };

  let scrollFrame;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;

    scrollFrame = requestAnimationFrame(() => {
      updateActiveRelease();
      scrollFrame = undefined;
    });
  }, { passive: true });

  links.forEach((link) => {
    link.addEventListener('click', () => setActiveRelease(link.dataset.releaseLink));
  });

  document.querySelectorAll('[data-copy-release]').forEach((button) => {
    const defaultLabel = button.getAttribute('aria-label');

    button.addEventListener('click', async () => {
      const releaseId = button.dataset.copyRelease;
      const releaseUrl = new URL(window.location.href);
      releaseUrl.search = '';
      releaseUrl.hash = releaseId;

      try {
        await navigator.clipboard.writeText(releaseUrl.toString());
        button.classList.add('is-copied');
        button.setAttribute('aria-label', 'Link copied');
        button.title = 'Link copied';
        button.querySelector('[aria-live]')?.replaceChildren('Link copied');

        window.setTimeout(() => {
          button.classList.remove('is-copied');
          button.setAttribute('aria-label', defaultLabel);
          button.title = 'Copy link to release';
          button.querySelector('[aria-live]')?.replaceChildren();
        }, 2000);
      } catch {
        button.setAttribute('aria-label', 'Unable to copy link');
        button.title = 'Unable to copy link';
        button.querySelector('[aria-live]')?.replaceChildren('Unable to copy link');
      }
    });
  });

  const initialRelease = window.location.hash.slice(1);
  setActiveRelease(sections.some((section) => section.id === initialRelease) ? initialRelease : sections[0].id);
  updateActiveRelease();
})();