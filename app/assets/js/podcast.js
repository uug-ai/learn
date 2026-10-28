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
    let playRequest = 0;

    const close = () => {
      playRequest++;
      audio.pause();
      root.hidden = true;
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

    const highlightChapter = () => {
      const current = chapters.findLast((button) => Number(button.dataset.start) <= audio.currentTime);
      chapters.forEach((button) => {
        if (button === current) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
    };
    audio.addEventListener('timeupdate', highlightChapter);
    audio.addEventListener('loadedmetadata', highlightChapter);
    highlightChapter();

    chapters.forEach((button) => {
      button.addEventListener('click', async () => {
        const request = ++playRequest;
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
          status.textContent = '';
        } catch (error) {
          if (request !== playRequest) return;
          status.textContent = `Playback could not start: ${error.message}. Use the audio controls or download the MP3.`;
        }
      });
    });

    speed.addEventListener('change', () => {
      audio.playbackRate = Number(speed.value);
    });
    audio.addEventListener('ratechange', () => {
      speed.value = String(audio.playbackRate);
    });
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
        status.textContent = 'The audio could not be loaded. Try the MP3 download or read the transcript.';
      });
    });
  });
})();
