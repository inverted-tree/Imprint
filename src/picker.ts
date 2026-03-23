import { App, SuggestModal, TFile } from 'obsidian';

export interface TemplateEntry {
  file: TFile;
  displayName: string;
  isRecent: boolean;
}

export class TemplatePicker extends SuggestModal<TemplateEntry> {
  private entries: TemplateEntry[];
  private onChoose: (entry: TemplateEntry) => void;

  constructor(app: App, entries: TemplateEntry[], onChoose: (entry: TemplateEntry) => void) {
    super(app);
    this.entries = entries;
    this.onChoose = onChoose;
    this.setPlaceholder('Pick a template…');
  }

  getSuggestions(query: string): TemplateEntry[] {
    const lower = query.toLowerCase();
    return this.entries.filter(e => e.displayName.toLowerCase().includes(lower));
  }

  renderSuggestion(entry: TemplateEntry, el: HTMLElement): void {
    const row = el.createEl('div', { cls: 'imprint-suggestion' });
    row.createEl('span', { text: entry.displayName });
    if (entry.isRecent) {
      row.createEl('span', { text: 'recent', cls: 'imprint-recent-badge' });
    }
  }

  onChooseSuggestion(entry: TemplateEntry, _evt: MouseEvent | KeyboardEvent): void {
    this.onChoose(entry);
  }
}
