// Published reader URLs use a hash of the note path. Pin renamed notes to their
// original path identity so existing bookmarks, search results and links survive.
export const renamedPublicNotes = [
  { locale: 'zh-TW', from: '40_重要他人/人物/前主人甲.md', to: '40_重要他人/人物/第一任主人.md', oldHeading: '前主人甲', heading: '第一任主人' },
  { locale: 'zh-TW', from: '40_重要他人/人物/前主人乙.md', to: '40_重要他人/人物/前主人.md', oldHeading: '前主人乙', heading: '前主人' },
  { locale: 'zh-TW', from: '40_重要他人/人物/前主人丙.md', to: '40_重要他人/人物/前女友.md', oldHeading: '前主人丙', heading: '前女友' },
  { locale: 'en', from: '40_Important people/People/Former master A.md', to: '40_Important people/People/First master.md', oldHeading: 'former-master-a', heading: 'first-master' },
  { locale: 'en', from: '40_Important people/People/Former master B.md', to: '40_Important people/People/Former master.md', oldHeading: 'former-master-b', heading: 'former-master' },
  { locale: 'en', from: '40_Important people/People/Former master C.md', to: '40_Important people/People/Ex-girlfriend.md', oldHeading: 'former-master-c', heading: 'ex-girlfriend' },
];

const originalPaths = new Map(renamedPublicNotes.map(({ from, to }) => [to, from]));
export const publicPathIdentity = path => originalPaths.get(path) ?? path;

// Old heading fragments remain valid without JavaScript. Keep them out of the
// outline and visible prose; language switching maps them to the new heading.
export const legacyHeadingIds = {
  ...Object.fromEntries(renamedPublicNotes.map(({ to, oldHeading, heading }) => [to, { [oldHeading]: heading }])),
  '80_來源/相處回憶/相處片段.md': {
    '前主人甲-接納': '第一任主人-接納',
    '前主人乙-長椅': '前主人-長椅',
    '前主人丙-星空': '前女友-星空',
    '前主人丙-後來的問題': '前女友-後來的問題',
  },
  '80_Sources/Relationship recollections/Moments together.md': {
    'former-master-a-acceptance': 'first-master-acceptance',
    'former-master-b-the-bench': 'former-master-the-bench',
    'former-master-c-the-stars': 'ex-girlfriend-the-stars',
    'former-master-c-later-questions': 'ex-girlfriend-later-questions',
  },
};

export function retainLegacyHeadingIds(note) {
  for (const [oldId, currentId] of Object.entries(legacyHeadingIds[note.path] ?? {})) {
    const heading = new RegExp(`(<h[1-6] id="${currentId}">)`);
    if (!heading.test(note.html)) throw new Error(`${note.path}: missing compatibility heading ${currentId}`);
    note.html = note.html.replace(heading, `$1<span id="${oldId}" aria-hidden="true"></span>`);
  }
}
