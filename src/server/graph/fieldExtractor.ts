import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import type { Field } from '../types.js';

export async function extractFields(
  conversation: string,
  fields: Field[],
  llm: ChatOpenAI
): Promise<Record<string, string>> {
  // Build a dynamic schema based on the fields
  const fieldDescriptions = fields
    .map(f => `- ${f.key}: ${f.label}${f.required ? ' (required)' : ' (optional)'}`)
    .join('\n');

  const prompt = `Extract the following information from this conversation:

${fieldDescriptions}

Conversation:
${conversation}

For each field, extract the value if mentioned. If not mentioned or unclear, return an empty string.
Return the data as JSON with keys matching the field names.`;

  const response = await llm.invoke([
    { role: 'system', content: 'You are a data extraction assistant. Extract structured data from conversations and return valid JSON.' },
    { role: 'user', content: prompt }
  ]);

  try {
    // Try to parse JSON from the response
    const content = response.content.toString();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);

      // Filter to only include fields we're looking for
      const result: Record<string, string> = {};
      fields.forEach(field => {
        if (extracted[field.key]) {
          result[field.key] = String(extracted[field.key]);
        }
      });

      return result;
    }
  } catch (error) {
    console.error('Failed to extract fields:', error);
  }

  return {};
}

export function checkCompletion(
  fields: Record<string, string>,
  requiredFields: Field[]
): boolean {
  return requiredFields
    .filter(f => f.required)
    .every(f => fields[f.key] && fields[f.key].trim().length > 0);
}
