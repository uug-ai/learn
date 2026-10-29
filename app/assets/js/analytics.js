(() => {
  const script = document.currentScript;
  if (!script || window.__uugLearnAnalytics) return;
  const { measurementId, productionHost, pagePath, contentSection, productId } = script.dataset;
  // Debug builds run the consent flow anywhere but log to the console instead of loading Google.
  const debug = script.dataset.debug === 'true';
  if (!debug && (location.protocol !== 'https:' || location.hostname !== productionHost)) return;

  const banner = document.querySelector('#learn-cookie-banner');
  const status = document.querySelector('[data-analytics-status]');
  if (!banner || !status) {
    console.error('Learn analytics is disabled because consent controls are missing.');
    return;
  }
  window.__uugLearnAnalytics = true;
  // The footer animates with clip-path, which would clip this fixed banner; keep it outside.
  document.body.append(banner);
  const consentKey = 'uug-analytics-consent';
  const context = { site_area: 'learn', content_section: contentSection };
  if (productId) context.product_id = productId;
  let preference = null;
  let started = false;

  const notify = (message, error) => {
    status.textContent = message;
    status.hidden = false;
    console.warn(message, error);
  };
  const storedPreference = (value) => {
    if (value === null || value === 'granted' || value === 'denied') return value;
    console.warn('Unrecognized Learn analytics consent; asking again.');
    return null;
  };
  try {
    preference = storedPreference(localStorage.getItem(consentKey));
  } catch (error) {
    notify('Your cookie preference could not be read. Analytics cookies stay off until you accept them.', error);
  }

  function gtag() {
    if (debug) {
      console.info('[Learn analytics debug]', ...arguments);
      return;
    }
    window.dataLayer.push(arguments);
  }
  // Consent Mode v2 advanced: without consent GA only sends cookieless pings.
  const send = (name, parameters = {}) => {
    if (!started) return false;
    gtag('event', name, { send_to: measurementId, ...context, ...parameters });
    return true;
  };
  const referrer = () => {
    if (!document.referrer) return '';
    const url = new URL(document.referrer);
    return ['uug.ai', productionHost].includes(url.hostname)
      ? `${url.origin}${url.pathname}`
      : url.origin;
  };
  const start = () => {
    started = true;
    window.dataLayer = window.dataLayer || [];
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    if (preference === 'granted') gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false,
      page_location: `${location.origin}${pagePath}`,
      page_referrer: referrer(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: productionHost,
      cookie_prefix: 'learn',
      cookie_expires: 31536000,
      cookie_flags: 'SameSite=Lax;Secure',
      ...context,
    });
    send('page_view');
    if (debug) return;
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    tag.onerror = () => {
      notify('Google Analytics could not be loaded. You can still use every guide and resource.');
    };
    document.head.append(tag);
  };
  const clearCookies = () => {
    const names = document.cookie.split(';').map((cookie) => cookie.trim().split('=')[0])
      .filter((name) => /^learn_ga(?:_|$)/.test(name));
    names.forEach((name) => {
      const expired = `${name}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;
      document.cookie = expired;
      document.cookie = `${expired}; Domain=${productionHost}`;
    });
  };
  const showBanner = (visible) => {
    banner.hidden = !visible;
  };
  const applyPreference = () => {
    gtag('consent', 'update', { analytics_storage: preference === 'granted' ? 'granted' : 'denied' });
    if (preference !== 'granted') clearCookies();
    showBanner(preference === null);
  };
  banner.querySelectorAll('[data-analytics-consent]').forEach((button) => {
    button.addEventListener('click', () => {
      preference = button.dataset.analyticsConsent;
      applyPreference();
      try {
        localStorage.setItem(consentKey, preference);
        status.hidden = true;
      } catch (error) {
        notify('Your cookie preference could not be saved. This choice applies only to this page.', error);
        showBanner(true);
      }
    });
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== consentKey && event.key !== null) return;
    preference = storedPreference(event.key === null ? null : event.newValue);
    applyPreference();
  });

  const classify = (link, url) => {
    if (link.dataset.learnCta === 'view_demo' || url.hostname === 'app-demo.kerberos.io') {
      return { event: 'view_demo', id: 'view_demo' };
    }
    if (link.dataset.learnCta === 'contact_sales' ||
        (url.hostname === 'uug.ai' && /^\/contact\/?$/.test(url.pathname))) {
      return { event: 'contact_sales_click', id: 'contact_sales' };
    }
    if (url.protocol === 'mailto:') return { event: 'learn_resource_click', id: 'support_email' };
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    let id;
    if (url.hostname === 'github.com') id = 'github';
    else if (url.origin === location.origin && /^\/support\/?$/.test(url.pathname)) id = 'support';
    else if (url.origin === location.origin &&
        /^\/docs\/(?:agent|factory|hub|vault)\/(?:getting-started|installation|first-things-first)\/?$/.test(url.pathname)) id = 'getting_started';
    else if (url.hostname === 'uug.ai' && /^\/products\/(?:agent|factory|hub|vault)\/?$/.test(url.pathname)) id = 'product';
    else if (url.hostname === 'uug.ai' && url.pathname === '/') id = 'website';
    else if (link.hasAttribute('download')) id = 'download';
    return id ? { event: 'learn_resource_click', id } : null;
  };
  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    const url = new URL(link.href);
    const action = classify(link, url);
    if (!action) return;
    const placement = link.closest('footer') ? 'footer'
      : link.closest('nav') ? 'navigation'
      : link.closest('.content') ? 'article' : 'sidebar';
    const parameters = {
      cta_id: action.id,
      cta_placement: placement,
      destination_host: url.protocol === 'mailto:' ? 'email' : url.hostname,
    };
    if (action.id === 'product') parameters.product_id = url.pathname.split('/')[2];
    send(action.event, parameters);
  });
  const played = new WeakSet();
  document.addEventListener('play', (event) => {
    const audio = event.target;
    if (!(audio instanceof HTMLAudioElement) || played.has(audio)) return;
    if (!audio.closest('[data-podcast-player]')) return;
    if (send('learn_podcast_start')) played.add(audio);
  }, true);

  start();
  if (preference !== 'granted') clearCookies();
  showBanner(preference === null);
})();
