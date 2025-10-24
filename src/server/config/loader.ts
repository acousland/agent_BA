import { readFileSync } from 'fs';
import { join } from 'path';
import type { AppConfig } from '../types.js';

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = join(process.cwd(), 'app.config.json');
  const configData = readFileSync(configPath, 'utf-8');
  cachedConfig = JSON.parse(configData) as AppConfig;
  return cachedConfig;
}

export function getTopicById(topicId: string): AppConfig['topics'][0] | undefined {
  const config = loadConfig();
  return config.topics.find(t => t.id === topicId);
}
