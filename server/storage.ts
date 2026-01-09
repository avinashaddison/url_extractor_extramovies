import { type DomainSettings, DEFAULT_DOMAIN_SETTINGS } from "@shared/schema";

export interface IStorage {
  getDomainSettings(): DomainSettings;
  setDomainSettings(settings: DomainSettings): void;
}

export class MemStorage implements IStorage {
  private domainSettings: DomainSettings;

  constructor() {
    this.domainSettings = { ...DEFAULT_DOMAIN_SETTINGS };
  }

  getDomainSettings(): DomainSettings {
    return this.domainSettings;
  }

  setDomainSettings(settings: DomainSettings): void {
    this.domainSettings = settings;
  }
}

export const storage = new MemStorage();
