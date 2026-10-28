(() => {
  document.querySelectorAll('[data-podcast-player]').forEach((root) => {
    const audio = root.querySelector('audio');
    const status = root.querySelector('[data-podcast-status]');
    const speed = root.querySelector('[data-podcast-speed]');
    const transcript = root.querySelector('[data-podcast-transcript]');
    const mediaSources = [audio, ...root.querySelectorAll('audio source')];
    const chapters = [...root.querySelectorAll('[data-start]')];
    const toggle = [...document.querySelectorAll('[data-podcast-toggle]')]
      .find((button) => button.getAttribute('aria-controls') === root.id);
    const topics = new Map();
    chapters.forEach((button, index) => {
      const id = button.dataset.sourceAnchor;
      if (!id) return;
      if (topics.has(id)) {
        topics.get(id).chapters.push(index);
        return;
      }
      const heading = document.getElementById(id)?.closest('h2, h3, h4, h5, h6');
      const content = root.closest('.content');
      if (!heading || !content?.contains(heading)) {
        status.textContent = 'Some podcast topics could not be linked to this page.';
        console.warn(`Podcast topic heading was not found: ${id}`);
        return;
      }
      const blocks = [heading];
      let block = heading.nextElementSibling;
      while (block && !/^H[1-6]$/.test(block.tagName)) {
        blocks.push(block);
        block = block.nextElementSibling;
      }
      blocks.forEach((element) => element.classList.add('learn-podcast-topic-block'));
      heading.classList.add('learn-podcast-topic-heading');
      topics.set(id, { chapters: [index], blocks, state: '' });
    });
    const content = topics.size ? root.closest('.content') : null;
    const highlight = content ? document.createElement('div') : null;
    let activeTopic = null;
    let followFrame;
    const updateTopicHighlight = () => {
      if (!highlight) return;
      highlight.hidden = !activeTopic;
      if (!activeTopic) return;
      const bounds = activeTopic.blocks.map((block) => block.getBoundingClientRect()).filter((box) => box.height > 0);
      const top = bounds[0].top;
      const bottom = Math.max(...bounds.map((box) => box.bottom));
      highlight.style.setProperty('--podcast-topic-top', `${top - content.getBoundingClientRect().top}px`);
      highlight.style.setProperty('--podcast-topic-height', `${bottom - top}px`);
    };
    const followTopic = () => {
      if (!activeTopic) return;
      cancelAnimationFrame(followFrame);
      followFrame = requestAnimationFrame(() => {
        if (!activeTopic || audio.ended || (toggle && root.hidden)) return;
        activeTopic.blocks[0].scrollIntoView({
          block: 'start',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
      });
    };
    if (highlight) {
      highlight.className = 'learn-podcast-topic-highlight';
      highlight.hidden = true;
      highlight.setAttribute('aria-hidden', 'true');
      content.classList.add('learn-podcast-topic-content');
      content.append(highlight);
      const observer = new ResizeObserver(updateTopicHighlight);
      observer.observe(content);
      topics.forEach((topic) => topic.blocks.forEach((block) => observer.observe(block)));
    }
    let playRequest = 0;
    let hasPlayed = false;
    let chapterSelected = false;
    const anchor = root.querySelector('[data-podcast-anchor]');
    const controls = root.querySelector('[data-podcast-controls]');
    const returnButton = root.querySelector('[data-podcast-return]');
    const currentSection = root.querySelector('[data-podcast-current-section]');
    const dockClose = root.querySelector('[data-podcast-dock-close]');

    const updateDock = () => {
      if (!anchor || !controls) return;
      const docked = hasPlayed && !audio.ended && !root.hidden && anchor.getBoundingClientRect().bottom <= 0;
      controls.classList.toggle('is-docked', docked);
      returnButton.hidden = !docked;
      dockClose.hidden = !docked;
    };
    if (anchor && controls) {
      const observer = new IntersectionObserver(updateDock);
      observer.observe(anchor);
      window.addEventListener('scroll', updateDock, { passive: true });
      returnButton.addEventListener('click', () => {
        root.scrollIntoView({ block: 'center' });
        audio.focus({ preventScroll: true });
      });
    }

    const progressKey = root.dataset.podcastProgressKey;
    if (progressKey) {
      const progressNote = root.querySelector('[data-podcast-progress-note]');
      let savedTime = 0;
      let lastSave = 0;
      let storageAvailable = true;
      const storageFailed = (action, error) => {
        storageAvailable = false;
        progressNote.textContent = `Listening progress could not be ${action}. Playback is still available.`;
        progressNote.hidden = false;
        console.warn(`Podcast progress could not be ${action}:`, error);
      };
      try {
        const stored = localStorage.getItem(progressKey);
        if (stored) {
          const progress = JSON.parse(stored);
          if (!progress || typeof progress.version !== 'string' || !Number.isFinite(progress.time) || progress.time < 0) {
            throw new Error('Invalid saved listening progress');
          }
          if (progress.version === root.dataset.podcastVersion) savedTime = progress.time;
        }
      } catch (error) {
        storageFailed('restored', error);
      }
      if (savedTime > 0) {
        const minutes = Math.floor(savedTime / 60);
        const seconds = String(Math.floor(savedTime % 60)).padStart(2, '0');
        progressNote.textContent = `Saved at ${minutes}:${seconds}. Start playback to continue.`;
        progressNote.hidden = false;
      }
      audio.addEventListener('loadedmetadata', () => {
        if (!chapterSelected && savedTime > 0 && savedTime < audio.duration) audio.currentTime = savedTime;
      });
      const saveProgress = () => {
        if (!storageAvailable || !hasPlayed || !Number.isFinite(audio.currentTime)) return;
        try {
          if (audio.ended) localStorage.removeItem(progressKey);
          else localStorage.setItem(progressKey, JSON.stringify({
            version: root.dataset.podcastVersion, time: audio.currentTime,
          }));
          lastSave = Date.now();
        } catch (error) {
          storageFailed('saved', error);
        }
      };
      audio.addEventListener('timeupdate', () => {
        if (Date.now() - lastSave >= 5000) saveProgress();
      });
      ['pause', 'seeked', 'ended'].forEach((event) => audio.addEventListener(event, saveProgress));
      window.addEventListener('pagehide', saveProgress);
      audio.addEventListener('play', () => {
        if (storageAvailable) progressNote.hidden = true;
      });
    }

    audio.addEventListener('play', () => {
      if (toggle && root.hidden) {
        audio.pause();
        return;
      }
      hasPlayed = true;
      updateDock();
      highlightChapter(true);
    });
    audio.addEventListener('ended', updateDock);

    const close = () => {
      playRequest++;
      audio.pause();
      root.hidden = true;
      updateDock();
      highlightChapter();
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    };

    if (toggle) {
      toggle.addEventListener('click', () => {
        if (!root.hidden) {
          close();
          return;
        }
        root.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        highlightChapter();
        audio.focus();
      });
      root.querySelectorAll('[data-podcast-close]').forEach((button) => {
        button.addEventListener('click', close);
      });
      root.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      });
    }

    const highlightChapter = (follow = false) => {
      const currentIndex = chapters.findLastIndex((button) => Number(button.dataset.start) <= audio.currentTime);
      chapters.forEach((button) => {
        if (button === chapters[currentIndex]) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      let nextTopic = null;
      topics.forEach((topic) => {
        const state = hasPlayed && !audio.ended && !(toggle && root.hidden) &&
          topic.chapters.includes(currentIndex) ? 'current' : '';
        if (state) nextTopic = topic;
        if (topic.state === state) return;
        topic.state = state;
        topic.blocks.forEach((element) => {
          if (state) element.setAttribute('data-podcast-topic-state', state);
          else element.removeAttribute('data-podcast-topic-state');
        });
      });
      if (activeTopic !== nextTopic) {
        activeTopic = nextTopic;
        if (currentSection) {
          currentSection.textContent = activeTopic ? activeTopic.blocks[0].textContent.trim() : '';
          currentSection.title = currentSection.textContent;
          currentSection.hidden = !activeTopic;
        }
        updateTopicHighlight();
        if (follow) followTopic();
      }
    };
    ['timeupdate', 'loadedmetadata', 'seeked', 'ended'].forEach((event) => {
      audio.addEventListener(event, () => highlightChapter(true));
    });
    highlightChapter();

    chapters.forEach((button) => {
      button.addEventListener('click', async () => {
        const request = ++playRequest;
        chapterSelected = true;
        try {
          if (audio.readyState < 1) {
            await new Promise((resolve, reject) => {
              const loaded = () => { cleanup(); resolve(); };
              const failed = () => { cleanup(); reject(new Error('The audio could not be loaded')); };
              const cleanup = () => {
                audio.removeEventListener('loadedmetadata', loaded);
                mediaSources.forEach((source) => source.removeEventListener('error', failed));
              };
              audio.addEventListener('loadedmetadata', loaded, { once: true });
              mediaSources.forEach((source) => source.addEventListener('error', failed, { once: true }));
              audio.load();
            });
          }
          if (request !== playRequest || (toggle && root.hidden)) return;
          audio.currentTime = Number(button.dataset.start);
          await audio.play();
          if (request !== playRequest || (toggle && root.hidden)) return;
          highlightChapter();
          followTopic();
          status.textContent = '';
        } catch (error) {
          if (request !== playRequest) return;
          status.textContent = `Playback could not start: ${error.message}. Use the audio controls or reload the page to try again.`;
        }
      });
    });

    if (speed) {
      speed.addEventListener('change', () => {
        audio.playbackRate = Number(speed.value);
      });
      audio.addEventListener('ratechange', () => {
        speed.value = String(audio.playbackRate);
      });
    }
    root.querySelectorAll('[data-skip]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!Number.isFinite(audio.duration)) {
          status.textContent = 'Audio is not ready yet. Use the audio controls to load it first.';
          return;
        }
        audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + Number(button.dataset.skip)));
        status.textContent = '';
      });
    });
    root.querySelectorAll('[data-transcript]').forEach((link) => {
      link.addEventListener('click', () => { transcript.open = true; });
    });
    mediaSources.forEach((source) => {
      source.addEventListener('error', () => {
        status.textContent = 'The audio could not be loaded. Reload the page to try again.';
      });
    });
  });
})();
