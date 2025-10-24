import { readFileSync } from 'fs';
import { join } from 'path';
import type { AppConfig, StepConfig, TopicConfig } from '../types.js';

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

export function getStepById(stepId: string): StepConfig | undefined {
  const config = loadConfig();
  return config.steps.find(s => s.stepId === stepId);
}

export function getTopicByFieldName(stepId: string, fieldName: string): TopicConfig | undefined {
  const step = getStepById(stepId);
  if (!step) return undefined;
  return step.topics.find(t => t.fieldName === fieldName);
}

export function getAllSteps(): StepConfig[] {
  const config = loadConfig();
  return config.steps;
}
