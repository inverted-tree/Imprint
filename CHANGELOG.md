# Changelog

## [1.1.0] - 2026-03-23

### Added
- List format setting — frontmatter arrays can be inserted as comma-separated values (default) or as a markdown list (`- item`)

### Fixed
- Recent templates in the picker were rendering as `<name>recent` instead of just the name; the badge has been removed (recents still surface at the top of the list)

## [1.0.0] - 2026-03-23

### Added
- Fuzzy-search template picker listing all `.md` files in the configured templates folder, with subfolder support
- `{{Key}}` substitution from the active note's YAML frontmatter
- `{{Key:default}}` syntax — specify a fallback value for keys absent from frontmatter
- `{{cursor}}` placeholder — cursor is moved to this position after insertion
- `[[{{Key}}]]` wikilink handling — strips inner `[[ ]]` from wikilink-valued frontmatter fields to keep syntax valid
- Built-in defaults: `{{title}}` (note filename), `{{date}}`, `{{time}}`; overridden when a matching frontmatter key exists
- Configurable `{{date}}` and `{{time}}` formats in settings (tokens: `YYYY MM DD HH hh mm ss A`)
- **Fill template fields** command — fills remaining `{{Key}}` placeholders in the current note from its frontmatter; assignable to a hotkey
- **Create note from template** command — prompts for a note name, creates the file alongside the active note, and applies the template
- Recently used templates (up to 5) appear at the top of the picker
- Settings tab: templates folder, date format, time format
- Justfile with `install` recipe for copying the plugin into a vault
- CI workflow (build check on push/PR) and release workflow (publishes GitHub release with assets on version tag)
