import { MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { TemplatePicker, TemplateEntry } from './picker';
import {
  DEFAULT_SETTINGS,
  ImprintSettings,
  ImprintSettingTab,
} from './settings';

export default class ImprintPlugin extends Plugin {
  settings: ImprintSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ImprintSettingTab(this.app, this));
    this.addCommand({
      id: 'open-template-picker',
      name: 'Open template picker',
      callback: () => this.openPicker(),
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private getTemplateEntries(): TemplateEntry[] {
    const folder = this.settings.templatesFolder.replace(/\/$/, '');
    const entries: TemplateEntry[] = [];

    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(folder + '/')) continue;
      // relative path inside the templates folder, without the leading folder/
      const relative = file.path.slice(folder.length + 1);
      // Replace path separators with " / " and strip .md extension
      const displayName = relative.replace(/\.md$/, '').replace(/\//g, ' / ');
      entries.push({ file, displayName });
    }

    return entries.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  private openPicker() {
    const entries = this.getTemplateEntries();
    if (entries.length === 0) {
      new Notice('No templates found in folder: ' + this.settings.templatesFolder);
      return;
    }
    new TemplatePicker(this.app, entries, (entry) => this.insertTemplate(entry.file)).open();
  }

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
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
    };

    // Merge: defaults provide fallbacks; frontmatter values take precedence
    const values: Record<string, unknown> = { ...defaults, ...frontmatter };

    const content = await this.app.vault.read(templateFile);
    const result = this.substituteContent(content, values);
    activeView.editor.replaceSelection(result);
  }

  /**
   * Replaces {{Key}} placeholders with matching frontmatter values.
   *
   * Special case: if a placeholder is already wrapped in [[ ]] in the template
   * (e.g. [[{{CoverURL}}]]) and the frontmatter value itself starts/ends with
   * [[ ]], the inner brackets are stripped so the result stays valid wikilink
   * syntax.
   */
  private substituteContent(
    content: string,
    frontmatter: Record<string, unknown>
  ): string {
    // Pass 1: handle [[{{Key}}]] — strip [[ ]] from value when present
    content = content.replace(/\[\[{{([^{}]+)}}\]\]/g, (_match, rawKey) => {
      const key = rawKey.trim();
      if (!(key in frontmatter)) return `[[{{${key}}}]]`;
      const value = this.formatValue(frontmatter[key]);
      const stripped = value.replace(/^\[\[/, '').replace(/\]\]$/, '');
      return `[[${stripped}]]`;
    });

    // Pass 2: handle remaining {{Key}} placeholders
    content = content.replace(/{{([^{}]+)}}/g, (_match, rawKey) => {
      const key = rawKey.trim();
      if (!(key in frontmatter)) return `{{${key}}}`;
      return this.formatValue(frontmatter[key]);
    });

    return content;
  }

  private formatValue(value: unknown): string {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '';
    return String(value);
  }
}
