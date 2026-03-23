import { App, PluginSettingTab, Setting } from 'obsidian';
import type ImprintPlugin from './main';

export interface ImprintSettings {
  templatesFolder: string;
  dateFormat: string;
  timeFormat: string;
  recentTemplates: string[];
}

export const DEFAULT_SETTINGS: ImprintSettings = {
  templatesFolder: 'Templates',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm',
  recentTemplates: [],
};

export class ImprintSettingTab extends PluginSettingTab {
  plugin: ImprintPlugin;

  constructor(app: App, plugin: ImprintPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName('Templates folder')
      .setDesc('Path relative to vault root (e.g. Templates)')
      .addText(text =>
        text
          .setPlaceholder('Templates')
          .setValue(this.plugin.settings.templatesFolder)
          .onChange(async (value) => {
            this.plugin.settings.templatesFolder = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName('Date format')
      .setDesc('Format for {{date}}. Tokens: YYYY MM DD.')
      .addText(text =>
        text
          .setPlaceholder('YYYY-MM-DD')
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName('Time format')
      .setDesc('Format for {{time}}. Tokens: HH hh mm ss A.')
      .addText(text =>
        text
          .setPlaceholder('HH:mm')
          .setValue(this.plugin.settings.timeFormat)
          .onChange(async (value) => {
            this.plugin.settings.timeFormat = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
