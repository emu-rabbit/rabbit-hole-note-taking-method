function supportedLocale(value = '') {
  if (/^zh(?:-|$)/i.test(value)) return 'zh-TW';
  if (/^en(?:-|$)/i.test(value)) return 'en';
  return undefined;
}

export function chooseLocale(requested, languages) {
  return supportedLocale(requested) ?? languages.map(supportedLocale).find(Boolean) ?? 'en';
}

export function equivalentUrl(href, destinationPath, fragments = {}) {
  const url = new URL(destinationPath, href);
  const current = new URL(href);
  let fragment;
  try { fragment = decodeURIComponent(current.hash.slice(1)); } catch { fragment = ''; }
  if (fragments[fragment]) url.hash = fragments[fragment];
  return url;
}

export function initializeLocale(english) {
  const url = new URL(location.href);
  const requested = url.searchParams.get('lang');
  const contentLocale = document.body.dataset.contentLocale;
  const locale = chooseLocale(requested ?? contentLocale, [...navigator.languages, navigator.language]);
  const counterpart = document.body.dataset.counterpart;
  const fragments = JSON.parse(document.body.dataset.fragments || '{}');
  if (contentLocale && locale !== contentLocale && counterpart) {
    const destination = equivalentUrl(location.href, counterpart, fragments);
    destination.searchParams.set('lang', locale);
    location.replace(destination);
    return () => {};
  }
  if (!contentLocale && requested !== locale) {
    url.searchParams.set('lang', locale);
    history.replaceState(history.state, '', url);
  }
  document.documentElement.lang = locale;

  for (const button of document.querySelectorAll('.language-switcher [data-locale]')) {
    if (button.tagName !== 'A') button.setAttribute('aria-pressed', String(button.dataset.locale === locale));
    button.addEventListener('click', event => {
      if (event?.button > 0 || event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey) return;
      if (button.dataset.locale === locale) return;
      event?.preventDefault();
      const destination = counterpart ? equivalentUrl(location.href, counterpart, fragments) : new URL(location.href);
      destination.searchParams.set('lang', button.dataset.locale);
      location.assign(destination);
    });
  }

  function localize(root) {
    if (locale === 'en') {
      for (const attribute of ['', 'aria-label', 'title', 'placeholder', 'content', 'alt', 'href']) {
        const marker = attribute ? `data-i18n-${attribute}` : 'data-i18n';
        for (const element of root.querySelectorAll(`[${marker}]`)) {
          const message = english[element.getAttribute(marker)];
          if (message === undefined) continue;
          const text = message.replace('{number}', element.dataset.i18nNumber ?? '');
          if (attribute) element.setAttribute(attribute, text);
          else element.textContent = text;
        }
      }
    }
    for (const link of root.querySelectorAll('a[href^="./"], a[href^="../"]')) {
      if (link.hasAttribute('download') || link.dataset.locale) continue;
      const destination = new URL(link.href);
      if (link.dataset.exampleLink !== undefined) {
        destination.pathname = destination.pathname.replace(/\/reader(?:-en)?\//, locale === 'en' ? '/reader-en/' : '/reader/');
      }
      if (!contentLocale) destination.searchParams.set('lang', locale);
      link.href = destination.href;
    }
  }

  localize(document);
  return localize;
}
