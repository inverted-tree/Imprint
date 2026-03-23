<div align="center">
    <h1>Imprint</h1>
</div>

A deliberately simple [Obsidian](https://obsidian.md/) plugin that inserts templates with `{{Key}}` placeholder substitution drawn from the active note's YAML frontmatter.

Imprint is intentionally minimal. It replaces the built-in Templates plugin, which only offers a minimal set of substitutions (namely `{{date}}`, `{{time}}`, and `{{title}}`).

## Installation

### Manual installation
1. If you have [just](https://github.com/casey/just) installed on your machine, just run `just install`. Otherwise copy `main.js` and `manifest.json` into your vault at `.obsidian/plugins/imprint/`.
2. In Obsidian go to **Settings → Community plugins**, reload the list, and enable **Imprint**.
3. Optionally assign hotkeys under **Settings → Hotkeys** by searching for "Imprint".

## Quick example

Given a note with this frontmatter:

```yaml
---
Title: One Hundred Years of Solitude
Authors:
  - Gabriel García Márquez
Release: 1967-05-30
CoverURL: "[[Books/Covers/garcia_marquez_one_hundred_years.jpg]]"
---
```

And a template file `Templates/book-note.md`:

```markdown
![[{{CoverURL}}]]

# {{Title}}
**Author:** {{Authors}}
**Year:** {{Release}}
**Added:** {{date}}

{{cursor}}
```

Running **Open template picker** and selecting `book-note` inserts:

```markdown
![[Books/Covers/garcia_marquez_one_hundred_years.jpg]]

# One Hundred Years of Solitude
**Author:** Gabriel García Márquez
**Year:** 1967-05-30
**Added:** 2026-03-23

```

…with the cursor placed where `{{cursor}}` was.

## Template syntax

| Placeholder | Behaviour |
|---|---|
| `{{Key}}` | Replaced with the matching frontmatter value. Arrays are joined with `, `. Unknown keys are left as-is. |
| `{{Key:default}}` | Same, but substitutes `default` if the key is absent from the frontmatter. |
| `{{title}}` | The active note's filename (without `.md`). Overridden by a `title:` frontmatter field. |
| `{{date}}` | Today's date. Format configurable in settings (default `YYYY-MM-DD`). Overridden by a `date:` frontmatter field. |
| `{{time}}` | Current time. Format configurable in settings (default `HH:mm`). Overridden by a `time:` frontmatter field. |
| `{{cursor}}` | Removed from the output; the cursor is placed here after insertion. |
| `[[{{Key}}]]` | If the frontmatter value is itself a wikilink (e.g. `"[[path/to/file.jpg]]"`), the inner brackets are stripped so the result stays valid Obsidian wikilink syntax. |

### Date format tokens

`YYYY` `MM` `DD` `HH` (24h) `hh` (12h) `mm` `ss` `A` (AM/PM)

Example: `DD/MM/YYYY` → `23/03/2026`

## Commands

### Open template picker
Opens a fuzzy-search modal listing all templates in your configured folder. Selecting one inserts it at the cursor, with `{{Key}}` placeholders substituted from the active note's frontmatter.

Recently used templates appear at the top of the list.

### Create note from template
Same picker, but first asks for a new note name. Creates the note in the same folder as the currently active note, opens it, and applies the template. The `{{title}}` placeholder resolves to the name you entered.

### Fill template fields
No template picker involved. Scans the current note's body for any remaining `{{Key}}` placeholders and fills in the ones that now have a matching frontmatter value. Useful when you insert a template with incomplete frontmatter and fill in the values later.

Assign a hotkey to this under **Settings → Hotkeys → Imprint: Fill template fields**.

## Settings

| Setting | Default | Description |
|---|---|---|
| Templates folder | `Templates` | Path relative to vault root where template files live. |
| Date format | `YYYY-MM-DD` | Format string for `{{date}}`. |
| Time format | `HH:mm` | Format string for `{{time}}`. |

