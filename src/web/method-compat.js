const targets = JSON.parse(document.body.dataset.methodTargets);
const current = new URL(location.href);
const requested = current.searchParams.get('lang');
const locale = /^en(?:-|$)/i.test(requested ?? '') ? 'en'
  : /^zh(?:-|$)/i.test(requested ?? '') ? 'zh-TW' : document.body.dataset.methodLocale;
const target = targets[locale];
const destination = new URL(target.url);
let fragment = '';
try { fragment = decodeURIComponent(current.hash.slice(1)); } catch { /* Open the document if the old fragment is malformed. */ }
if (target.fragments[fragment]) destination.hash = target.fragments[fragment];
location.replace(destination.href);
