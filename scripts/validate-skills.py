#!/usr/bin/env python3
"""Validate the five-skill Rabbit Hole bundle's dependency-free format."""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

SKILLS = tuple('rabbit-hole-' + part for part in
               ('start', 'import', 'interview', 'maintain', 'share'))
LEGACY_SKILLS = ('rabbit-hole-write', 'rabbit-hole-connect')


def reject_legacy_skills(root: Path, names=None) -> None:
    """Require an explicit migration; never remove a user's existing skills."""
    if names is None:
        names = [name for name in LEGACY_SKILLS
                 if (root / name).exists() or (root / name).is_symlink()]
    legacy = sorted(set(names).intersection(LEGACY_SKILLS))
    if legacy:
        raise ValueError(
            f'legacy Rabbit Hole skills found in {root}: {", ".join(legacy)}. '
            'Back up and move these entries outside the skills directory before '
            'installing the five-skill bundle, then retry. Existing skills are never '
            'automatically removed or migrated.')


def scalar(value: str) -> str:
    value = value.strip()
    if value.startswith('"'):
        result = json.loads(value)
        if not isinstance(result, str):
            raise ValueError('expected a string')
        return result
    if value.startswith("'"):
        if len(value) < 2 or not value.endswith("'"):
            raise ValueError('unclosed quoted scalar')
        return value[1:-1].replace("''", "'")
    if not value or value[0] in '|>[]{&*!' or ': ' in value or ' #' in value:
        raise ValueError('use a single-line scalar (quote YAML punctuation)')
    return value


def no_symlinks(path: Path) -> None:
    for candidate in (path, *path.parents):
        if candidate.is_symlink():
            raise ValueError(f'symlink is not supported: {candidate}')


def anchors(text: str) -> set[str]:
    found, counts = set(), {}
    for heading in re.findall(r'^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$', text, re.M):
        heading = re.sub(r'\[([^]]+)\]\([^)]*\)', r'\1', heading)
        slug = re.sub(r'[^\w\- ]', '', heading.lower()).replace(' ', '-')
        count = counts.get(slug, 0)
        counts[slug] = count + 1
        found.add(slug + (f'-{count}' if count else ''))
    found.update(re.findall(r'(?:id|name)=["\']([^"\']+)["\']', text))
    return found


def check_link(file: Path, target: str, root: Path, bundle: bool = False) -> None:
    target = unquote(target.strip().strip('<>'))
    parsed = urlsplit(target)
    if parsed.scheme or parsed.netloc:
        return
    destination = (file.parent / parsed.path).resolve() if parsed.path else file.resolve()
    if not destination.is_relative_to(root.resolve()):
        raise ValueError(f'{file}: local link escapes installed skills: {target}')
    if bundle and not any(destination.is_relative_to((root / name).resolve()) for name in SKILLS):
        raise ValueError(f'{file}: local link escapes the five-skill bundle: {target}')
    if not destination.exists():
        raise ValueError(f'{file}: missing link target: {target}')
    if parsed.fragment and destination.suffix.lower() == '.md':
        if parsed.fragment not in anchors(destination.read_text(encoding='utf-8')):
            raise ValueError(f'{file}: missing heading anchor: {target}')


def validate(root: Path) -> None:
    no_symlinks(root)
    reject_legacy_skills(root)
    for name in SKILLS:
        directory = root / name
        if not directory.is_dir():
            raise ValueError(f'missing required skill: {name}')
        for entry in (directory, *directory.rglob('*')):
            no_symlinks(entry)
            if not entry.is_file() and not entry.is_dir():
                raise ValueError(f'unsupported file type: {entry}')
        skill = directory / 'SKILL.md'
        text = skill.read_text(encoding='utf-8')
        match = re.match(r'\A---\n(.*?)\n---\n(.+)', text, re.S)
        if not match:
            raise ValueError(f'{skill}: requires frontmatter and a nonempty body')
        fields = {}
        for line in match[1].splitlines():
            pair = re.fullmatch(r'(name|description):\s*(.+)', line)
            if not pair or pair[1] in fields:
                raise ValueError(f'{skill}: supported frontmatter is unique name/description scalars')
            fields[pair[1]] = scalar(pair[2])
        if fields.get('name') != name or len(name) > 64:
            raise ValueError(f'{skill}: name must match directory')
        if not fields.get('description', '').strip() or len(fields['description']) > 1024:
            raise ValueError(f'{skill}: description must contain 1–1024 characters')
        for markdown in directory.rglob('*.md'):
            body = markdown.read_text(encoding='utf-8')
            if re.search(r'\b(?:TODO|FIXME|TBD)\b|\[(?:INSERT|REPLACE)[^]]*\]', body):
                raise ValueError(f'{markdown}: unfinished placeholder')
            # Ignore fenced examples, which can legitimately show hypothetical paths.
            prose = re.sub(r'^\s*(`{3,}|~{3,}).*?^\s*\1\s*$', '', body, flags=re.M | re.S)
            for target in re.findall(r'!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["\'][^\n]*?["\'])?\s*\)', prose):
                check_link(markdown, target, root, bundle=True)
            for target in re.findall(r'^\s*\[[^]]+\]:\s*(<[^>]+>|\S+)', prose, re.M):
                check_link(markdown, target, root, bundle=True)
        ui = directory / 'agents' / 'openai.yaml'
        if ui.exists():
            section, values = None, {}
            for line in ui.read_text(encoding='utf-8').splitlines():
                if not line.strip() or line.lstrip().startswith('#'):
                    continue
                if line in ('interface:', 'policy:'):
                    section = line[:-1]
                    continue
                pair = re.fullmatch(r'  ([a-z_]+): (.+)', line)
                if section is None or not pair or (section, pair[1]) in values:
                    raise ValueError(f'{ui}: unsupported or duplicate YAML field: {line}')
                key, raw = pair.groups()
                allowed = {'display_name', 'short_description', 'default_prompt', 'icon_small', 'icon_large', 'brand_color'} if section == 'interface' else {'allow_implicit_invocation'}
                if key not in allowed:
                    raise ValueError(f'{ui}: unsupported field {key}')
                if section == 'policy':
                    if raw not in ('true', 'false'):
                        raise ValueError(f'{ui}: policy must be boolean')
                    value = raw
                else:
                    if raw[0] not in '\"\'':
                        raise ValueError(f'{ui}: quote string values')
                    value = scalar(raw)
                    if not value.strip():
                        raise ValueError(f'{ui}: empty {key}')
                    if key == 'short_description' and not 25 <= len(value) <= 64:
                        raise ValueError(f'{ui}: short_description needs 25–64 characters')
                    if key == 'default_prompt' and not re.search(r'\$' + re.escape(name) + r'(?![a-zA-Z0-9_-])', value):
                        raise ValueError(f'{ui}: default_prompt must mention ${name}')
                    if key == 'brand_color' and not re.fullmatch(r'#[0-9a-fA-F]{6}', value):
                        raise ValueError(f'{ui}: invalid brand_color')
                    if key.startswith('icon_'):
                        check_link(skill, value, directory)
                values[section, key] = value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--skills-dir', type=Path, default=Path(__file__).resolve().parents[1] / 'skills')
    args = parser.parse_args()
    try:
        validate(args.skills_dir)
    except (ValueError, OSError) as exc:
        parser.exit(1, f'Validation failed: {exc}\n')
    print(f'Validated all {len(SKILLS)} Rabbit Hole skills in {args.skills_dir}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
