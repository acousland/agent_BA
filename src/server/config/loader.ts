import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { AppConfig } from '../types.js';

const configCache = new Map<string, AppConfig>();
let currentConfigName = 'initial-idea-development'; // Default config

export function listConfigs(): string[] {
  const configsDir = join(process.cwd(), 'configs');
  const files = readdirSync(configsDir);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

export function loadConfig(configName?: string): AppConfig {
  const name = configName || currentConfigName;

  if (configCache.has(name)) {
    return configCache.get(name)!;
  }

  const configPath = join(process.cwd(), 'configs', `${name}.json`);
  const configData = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData) as AppConfig;

  configCache.set(name, config);
  return config;
}

export function setCurrentConfig(configName: string): void {
  currentConfigName = configName;
}

export function getCurrentConfigName(): string {
  return currentConfigName;
}

export function getTopicById(topicId: string, configName?: string): AppConfig['topics'][0] | undefined {
  const config = loadConfig(configName);
  return config.topics.find(t => t.id === topicId);
}
