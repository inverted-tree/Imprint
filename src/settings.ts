import { App, PluginSettingTab, Setting } from 'obsidian';
import type ImprintPlugin from './main';

export interface ImprintSettings {
  templatesFolder: string;
}

export const DEFAULT_SETTINGS: ImprintSettings = {
  templatesFolder: 'Templates',
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
  }
}
