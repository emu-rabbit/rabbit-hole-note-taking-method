function supportedLocale(value = '') {
  if (/^zh(?:-|$)/i.test(value)) return 'zh-TW';
  if (/^en(?:-|$)/i.test(value)) return 'en';
  return undefined;
}

export function chooseLocale(requested, languages) {
  return supportedLocale(requested) ?? languages.map(supportedLocale).find(Boolean) ?? 'en';
}

export function initializeLocale(english) {
  const url = new URL(location.href);
  const requested = url.searchParams.get('lang');
  const locale = chooseLocale(requested, [...navigator.languages, navigator.language]);
  if (requested !== locale) {
    url.searchParams.set('lang', locale);
    history.replaceState(history.state, '', url);
  }
  document.documentElement.lang = locale;

  if (locale === 'en') {
    for (const attribute of ['', 'aria-label', 'title', 'placeholder', 'content', 'alt']) {
      const marker = attribute ? `data-i18n-${attribute}` : 'data-i18n';
      for (const element of document.querySelectorAll(`[${marker}]`)) {
        const message = english[element.getAttribute(marker)];
        if (message === undefined) continue;
        const text = message.replace('{number}', element.dataset.i18nNumber ?? '');
        if (attribute) element.setAttribute(attribute, text);
        else element.textContent = text;
      }
    }
  }

  for (const button of document.querySelectorAll('.language-switcher [data-locale]')) {
    button.setAttribute('aria-pressed', String(button.dataset.locale === locale));
    button.addEventListener('click', () => {
      if (button.dataset.locale === locale) return;
      const destination = new URL(location.href);
      destination.searchParams.set('lang', button.dataset.locale);
      location.assign(destination);
    });
  }

  function localizeLinks(root) {
    for (const link of root.querySelectorAll('a[href^="./"], a[href^="../"]')) {
      const destination = new URL(link.href);
      destination.searchParams.set('lang', locale);
      link.href = destination.href;
    }
  }

  localizeLinks(document);
  return localizeLinks;
}
