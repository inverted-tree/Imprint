import { Editor, MarkdownView, Modal, Notice, Plugin, TFile } from 'obsidian';
import { TemplatePicker, TemplateEntry } from './picker';
import {
  DEFAULT_SETTINGS,
  ImprintSettings,
  ImprintSettingTab,
} from './settings';

// ---------------------------------------------------------------------------
// Date formatter — no external dependencies
// ---------------------------------------------------------------------------

function formatDate(date: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  return fmt
    .replace('YYYY', String(date.getFullYear()))
    .replace('MM',   pad(date.getMonth() + 1))
    .replace('DD',   pad(date.getDate()))
    .replace('HH',   pad(hours24))
    .replace('hh',   pad(hours12))
    .replace('mm',   pad(date.getMinutes()))
    .replace('ss',   pad(date.getSeconds()))
    .replace('A',    hours24 < 12 ? 'AM' : 'PM');
}

// ---------------------------------------------------------------------------
// Placeholder parser — splits "Key:default value" into key + optional default
// ---------------------------------------------------------------------------

function parseKey(raw: string): { key: string; defaultValue: string | null } {
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return { key: raw.trim(), defaultValue: null };
  return {
    key: raw.slice(0, colonIdx).trimEnd(),
    defaultValue: raw.slice(colonIdx + 1).trimStart(),
  };
}

// ---------------------------------------------------------------------------
// Frontmatter splitter — separates the YAML header from the note body
// ---------------------------------------------------------------------------

function splitFrontmatter(content: string): { header: string; body: string } {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return { header: '', body: content };
  }
  const closeIdx = content.indexOf('\n---', 4);
  if (closeIdx === -1) return { header: '', body: content };
  const bodyStart = content.indexOf('\n', closeIdx + 4);
  if (bodyStart === -1) return { header: content, body: '' };
  return {
    header: content.slice(0, bodyStart + 1),
    body: content.slice(bodyStart + 1),
  };
}

// ---------------------------------------------------------------------------
// NoteNameModal — prompts for a new note's filename
// ---------------------------------------------------------------------------

class NoteNameModal extends Modal {
  private onSubmit: (name: string) => void;

  constructor(app: InstanceType<typeof Plugin>['app'], onSubmit: (name: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: 'New note name' });
    const input = contentEl.createEl('input', { type: 'text', cls: 'imprint-note-name-input' });
    input.style.width = '100%';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        this.close();
        this.onSubmit(input.value.trim());
      }
    });
    // Focus after the modal animation settles
    setTimeout(() => input.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ---------------------------------------------------------------------------
// Main plugin
// ---------------------------------------------------------------------------

export default class ImprintPlugin extends Plugin {
  settings: ImprintSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ImprintSettingTab(this.app, this));

    this.addCommand({
      id: 'open-template-picker',
      name: 'Open template picker',
      callback: () => this.openPicker((entry) => this.insertTemplate(entry.file)),
    });

    this.addCommand({
      id: 'create-note-from-template',
      name: 'Create note from template',
      callback: () => this.openPicker((entry) => this.createNoteFromTemplate(entry.file)),
    });

    this.addCommand({
      id: 'fill-template-fields',
      name: 'Fill template fields',
      editorCallback: (editor, view) => this.fillTemplateFields(editor, view.file),
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // -------------------------------------------------------------------------
  // Template entries
  // -------------------------------------------------------------------------

  private getTemplateEntries(): TemplateEntry[] {
    const folder = this.settings.templatesFolder.replace(/\/$/, '');
    const recents = this.settings.recentTemplates;
    const recent: TemplateEntry[] = [];
    const rest: TemplateEntry[] = [];

    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(folder + '/')) continue;
      const relative = file.path.slice(folder.length + 1);
      const displayName = relative.replace(/\.md$/, '').replace(/\//g, ' / ');
      const isRecent = recents.includes(file.path);
      const entry: TemplateEntry = { file, displayName, isRecent };
      if (isRecent) {
        recent.push(entry);
      } else {
        rest.push(entry);
      }
    }

    // Sort recents by recency order, rest alphabetically
    recent.sort((a, b) => recents.indexOf(a.file.path) - recents.indexOf(b.file.path));
    rest.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return [...recent, ...rest];
  }

  private openPicker(onChoose: (entry: TemplateEntry) => void) {
    const entries = this.getTemplateEntries();
    if (entries.length === 0) {
      new Notice('No templates found in folder: ' + this.settings.templatesFolder);
      return;
    }
    new TemplatePicker(this.app, entries, onChoose).open();
  }

  // -------------------------------------------------------------------------
  // Record recently used
  // -------------------------------------------------------------------------

  private async recordRecentTemplate(file: TFile) {
    this.settings.recentTemplates = [
      file.path,
      ...this.settings.recentTemplates.filter(p => p !== file.path),
    ].slice(0, 5);
    await this.saveSettings();
  }

  // -------------------------------------------------------------------------
  // Insert template at cursor
  // -------------------------------------------------------------------------

  private async insertTemplate(templateFile: TFile) {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      new Notice('No active markdown editor');
      return;
    }

    const activeFile = activeView.file;
    const frontmatter: Record<string, unknown> = activeFile
      ? (this.app.metadataCache.getFileCache(activeFile)?.frontmatter ?? {})
      : {};

    const now = new Date();
    const defaults: Record<string, string> = {
      title: activeFile ? activeFile.basename : '',
      date: formatDate(now, this.settings.dateFormat),
      time: formatDate(now, this.settings.timeFormat),
    };

    const values: Record<string, unknown> = { ...defaults, ...frontmatter };
    const content = await this.app.vault.read(templateFile);
    const { text, cursorOffset } = this.substituteContent(content, values);

    const editor = activeView.editor;
    const startPos = editor.getCursor();
    editor.replaceSelection(text);

    if (cursorOffset !== null) {
      const before = text.slice(0, cursorOffset);
      const lines = before.split('\n');
      const line = startPos.line + lines.length - 1;
      const ch = lines.length === 1
        ? startPos.ch + lines[0].length
        : lines[lines.length - 1].length;
      editor.setCursor({ line, ch });
    }

    await this.recordRecentTemplate(templateFile);
  }

  // -------------------------------------------------------------------------
  // Create note from template
  // -------------------------------------------------------------------------

  private createNoteFromTemplate(templateFile: TFile) {
    new NoteNameModal(this.app, async (noteName) => {
      // Determine parent folder from active file, fallback to vault root
      const activeFile = this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
      const parentPath = activeFile
        ? activeFile.parent?.path ?? ''
        : '';
      const filePath = parentPath ? `${parentPath}/${noteName}.md` : `${noteName}.md`;

      let newFile: TFile;
      try {
        newFile = await this.app.vault.create(filePath, '');
      } catch (e) {
        new Notice(`Could not create note: ${e}`);
        return;
      }

      await this.app.workspace.getLeaf().openFile(newFile);

      const newView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!newView) return;

      const now = new Date();
      const values: Record<string, unknown> = {
        title: noteName,
        date: formatDate(now, this.settings.dateFormat),
        time: formatDate(now, this.settings.timeFormat),
      };

      const content = await this.app.vault.read(templateFile);
      const { text, cursorOffset } = this.substituteContent(content, values);

      const editor = newView.editor;
      const startPos = editor.getCursor();
      editor.replaceSelection(text);

      if (cursorOffset !== null) {
        const before = text.slice(0, cursorOffset);
        const lines = before.split('\n');
        const line = startPos.line + lines.length - 1;
        const ch = lines.length === 1
          ? startPos.ch + lines[0].length
          : lines[lines.length - 1].length;
        editor.setCursor({ line, ch });
      }

      await this.recordRecentTemplate(templateFile);
    }).open();
  }

  // -------------------------------------------------------------------------
  // Fill template fields in the current note
  // -------------------------------------------------------------------------

  private fillTemplateFields(editor: Editor, file: TFile | null) {
    const frontmatter: Record<string, unknown> = file
      ? (this.app.metadataCache.getFileCache(file)?.frontmatter ?? {})
      : {};

    const now = new Date();
    const defaults: Record<string, string> = {
      title: file ? file.basename : '',
      date: formatDate(now, this.settings.dateFormat),
      time: formatDate(now, this.settings.timeFormat),
    };
    const values: Record<string, unknown> = { ...defaults, ...frontmatter };

    // Split off the YAML frontmatter block so we don't mangle it
    const full = editor.getValue();
    const { header, body } = splitFrontmatter(full);

    const { text: newBody } = this.substituteContent(body, values);
    if (newBody === body) {
      new Notice('No template fields to fill.');
      return;
    }

    const cursor = editor.getCursor();
    editor.setValue(header + newBody);
    editor.setCursor(cursor);
  }

  // -------------------------------------------------------------------------
  // Substitution
  // -------------------------------------------------------------------------

  /**
   * Replaces {{Key}} placeholders with matching values.
   *
   * Returns the substituted text and the character offset of {{cursor}} if
   * present (null otherwise). {{cursor}} is stripped from the output text.
   *
   * Special case: [[{{Key}}]] strips [[ ]] from wikilink-valued fields so the
   * result stays valid wikilink syntax.
   */
  private substituteContent(
    content: string,
    values: Record<string, unknown>
  ): { text: string; cursorOffset: number | null } {
    // Extract {{cursor}} position before any other substitution
    const cursorPlaceholder = '{{cursor}}';
    let cursorOffset: number | null = null;
    const cursorIdx = content.indexOf(cursorPlaceholder);
    if (cursorIdx !== -1) {
      content = content.slice(0, cursorIdx) + content.slice(cursorIdx + cursorPlaceholder.length);
      cursorOffset = cursorIdx;
    }

    // Pass 1: handle [[{{Key}}]] and [[{{Key:default}}]] — strip [[ ]] from value when present
    content = content.replace(/\[\[{{([^{}]+)}}\]\]/g, (_match, rawKey) => {
      const { key, defaultValue } = parseKey(rawKey);
      if (!(key in values)) {
        if (defaultValue !== null) return `[[${defaultValue}]]`;
        return `[[{{${key}}}]]`;
      }
      const value = this.formatValue(values[key]);
      const stripped = value.replace(/^\[\[/, '').replace(/\]\]$/, '');
      return `[[${stripped}]]`;
    });

    // Pass 2: handle remaining {{Key}} and {{Key:default}} placeholders
    content = content.replace(/{{([^{}]+)}}/g, (_match, rawKey) => {
      const { key, defaultValue } = parseKey(rawKey);
      if (!(key in values)) {
        if (defaultValue !== null) return defaultValue;
        return `{{${key}}}`;
      }
      return this.formatValue(values[key]);
    });

    return { text: content, cursorOffset };
  }

  private formatValue(value: unknown): string {
    if (Array.isArray(value)) {
      return this.settings.listFormat === 'markdown'
        ? value.map(v => `- ${v}`).join('\n')
        : value.join(', ');
    }
    if (value === null || value === undefined) return '';
    return String(value);
  }
}
