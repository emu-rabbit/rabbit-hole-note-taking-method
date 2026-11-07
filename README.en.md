# Rabbit Hole Notes

[繁體中文](README.md) · [Website](https://emu-rabbit.github.io/rabbit-hole-notes/?lang=en) · [Explore the example](https://emu-rabbit.github.io/rabbit-hole-notes/reader-en/index.html?lang=en)

A note-taking method for documenting a life. A rabbit hole brings together experiences, important people, relationships, stories, and creative work, so someone arriving later, whether a person or an agent, can get to know you through time and connections.

This repository holds the method website, a public example you can read in a browser, the website's source code, and an installable Rabbit Hole skills toolkit. The example contains 55 selected notes Emu-rabbit has chosen to share. Its English edition covers the same material as the Chinese edition. You can start with a short story before learning how the notes are organized.

## Where to start

- **Build your own rabbit hole**: Install the [five skills](docs/skills.en.md) and begin with one memory or selected local material. Starting, importing, interviewing, maintaining, and preparing a reading copy are complete goals. The agent handles writing, linking and re-reading, with private local defaults.
- **Experience a rabbit hole**: Open the [English example](https://emu-rabbit.github.io/rabbit-hole-notes/reader-en/index.html?lang=en). Its entrance offers three short routes, beginning with a box of macarons, a useful tool, or two people in her life. The reading map offers more ways to continue.
- **Learn the method**: Visit the [introduction](https://emu-rabbit.github.io/rabbit-hole-notes/?lang=en), then read the full [Rabbit Hole Method](<docs/method.en.md>). The translation includes English folder names and key filenames you can follow.
- **Try it in Obsidian**: Choose “Download example” in the reader. Extract the ZIP and open the folder containing README.md as a vault. Start with that README; no community plugins are needed.
- **Read the original Chinese**: Visit the [Chinese website](https://emu-rabbit.github.io/rabbit-hole-notes/?lang=zh-TW) or [Chinese example](https://emu-rabbit.github.io/rabbit-hole-notes/reader/index.html?lang=zh-TW). Switching languages in the reader takes you to the corresponding note.

You can also download the [English example ZIP](https://emu-rabbit.github.io/rabbit-hole-notes/downloads/emu-rabbit-en.zip) or [Chinese example ZIP](https://emu-rabbit.github.io/rabbit-hole-notes/downloads/emu-rabbit-tw.zip) directly. Each contains only that language's Markdown notes, so you do not need the whole code repository.

## What you will find

A project can lead back to the life around its creation. A person can lead to a shared scene. Footnotes lead to sources, keeping records from the time distinct from later recollections. Unfinished attempts and everyday companionship have a place alongside completed work.

The example's README offers a way in. The profile introduces its owner, the reading map offers journeys with places to stop, and the index helps you find a particular note. The reader also has a full file tree, but you do not need to learn the sections before you begin.

This public selection uses one index across its sections. It has no relationship circles, commissions and collaborations, or maintenance section. The full method describes a structure that can grow. When building your own rabbit hole, add folders as your material calls for them.

## Method, examples, and code

- [English method](docs/method.en.md) and [Chinese method](docs/method.zh-TW.md): the authoritative text, independent of personal examples.
- [examples/emu-rabbit-en/](examples/emu-rabbit-en/): the English translation of the personal public selection.
- [examples/emu-rabbit-tw/](examples/emu-rabbit-tw/): the original Chinese personal public selection.
- [src/web/](src/web/): the bilingual introduction, static reader, and build code.
- [src/web/example-paths.json](src/web/example-paths.json): corresponding note paths, used to check completeness and switch languages.
- [skills/](skills/): five skills installed together, sharing offline guidance, internal references and local initialization, import and check helpers in `rabbit-hole-start`.
- [docs/skills.en.md](docs/skills.en.md): installation, a first request, formats and limitations.
- [tests/](tests/): reader, archive, skill-installation and local-helper checks.

The local tools officially support macOS, Linux and Windows; see [installation](docs/skills.en.md#install-the-bundle) for versions and path requirements. Import accepts text, Markdown, normalized JSON and JSONL; native social exports need conversion first. Sharing preparation creates a local draft for your review and authorization before delivery. `src/mcp` remains a placeholder.

`40_Important relationships` holds `People/`, `Pets/`, `Dolls/` and `Relationship circles/`. People are one kind of important relationship; pets and dolls with an important emotional connection can have their own notes too. Create each folder when there is material for it.

## Make a rabbit hole of your own

Choose material you want to entrust to a person or agent, gradually connecting it to people, projects and words from the time. Your rabbit hole can remain private; you decide what can be read, organized and shared.

The example's people, stories, and sources belong to the author's life; keep their context intact. English source passages are marked as translations. Brackets and omission markers retain the boundaries of the published Chinese excerpts. Check the permissions for each source or project separately. This repository has no overall license yet; public access does not grant unrestricted reuse or redistribution.

## Develop locally

Use Node.js 22 or later. No additional packages need to be installed.

```sh
npm start
```

Open the address printed in the terminal. This builds both readers and ZIP downloads, then starts the local server.

```sh
npm run check
```

Run the tests and full build. The build checks paired translations, Wiki links, and section or block references, then writes dist/. When adding or renaming a note, update both editions and example-paths.json together, and read through the affected routes.

For skill changes, also run `python3 scripts/validate-skills.py` and `python3 -m unittest discover -s tests -p 'test_*.py' -v`. See the [usage guide](docs/skills.en.md) for Windows interpreter requirements and PowerShell commands.

GitHub Actions has two workflows: [Windows skills CI](.github/workflows/skills.yml) validates the bundle and runs Python 3.13/3.14 tests on native Windows Server 2025 x64 for PRs targeting `main` that match its path filters; [Pages deployment](.github/workflows/pages.yml) builds and publishes the site on `main` pushes or manual dispatch. Run the full website tests locally with `npm run check`. Work on a separate branch and open a PR, checking content, sources and public scope before a maintainer decides whether to merge.
