import { initializeLocale } from './locale.js';

import { siteEnglish } from './site-messages.js';

initializeLocale(siteEnglish);

for (const browser of document.querySelectorAll('.structure-browser')) {
  const tablist = browser.querySelector('.structure-tabs');
  const tabs = Array.from(tablist.querySelectorAll('.structure-tab'));

  function selectTab(selected) {
    for (const tab of tabs) {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab));
  }

  tablist.addEventListener('keydown', event => {
    const current = tabs.indexOf(event.target);
    let next;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (current + tabs.length - 1) % tabs.length;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        next = (current + 1) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectTab(tabs[next]);
    tabs[next].focus();
  });
}
