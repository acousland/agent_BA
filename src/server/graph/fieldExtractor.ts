import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import type { Field } from '../types.js';

export async function extractFields(
  conversation: string,
  fields: Field[],
  llm: ChatOpenAI
): Promise<Record<string, string | string[]>> {
  // Build a dynamic schema based on the fields
  const fieldDescriptions = fields
    .map(f => {
      if (f.type === 'multiselect' && f.options) {
        return `- ${f.key}: ${f.label} (array, must only contain values from: ${f.options.map(o => `"${o}"`).join(', ')})`;
      }
      const typeInfo = f.type === 'multiselect' ? ' (array of strings)' : ' (string)';
      return `- ${f.key}: ${f.label}${typeInfo}${f.required ? ' (required)' : ' (optional)'}`;
    })
    .join('\n');

  const prompt = `Extract the following information from this conversation:

${fieldDescriptions}

Conversation:
${conversation}

For each field, extract the value if mentioned. If not mentioned or unclear, return an empty string for text fields or an empty array for multiselect fields.
For multiselect fields, return an array of selected values. IMPORTANT: Only include values that exactly match the allowed options listed above.
Return the data as JSON with keys matching the field names.`;

  const response = await llm.invoke([
    { role: 'system', content: 'You are a data extraction assistant. Extract structured data from conversations and return valid JSON. Respect field types: use strings for text fields and arrays for multiselect fields.' },
    { role: 'user', content: prompt }
  ]);

  try {
    // Try to parse JSON from the response
    const content = response.content.toString();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);

      // Filter to only include fields we're looking for and ensure correct types
      const result: Record<string, string | string[]> = {};
      fields.forEach(field => {
        if (extracted[field.key] !== undefined && extracted[field.key] !== null) {
          if (field.type === 'multiselect') {
            // Ensure it's an array
            let values: string[] = [];
            if (Array.isArray(extracted[field.key])) {
              values = extracted[field.key];
            } else if (extracted[field.key]) {
              // If it's not an array but has a value, wrap it
              values = [String(extracted[field.key])];
            }

            // Validate against allowed options if provided
            if (field.options && field.options.length > 0) {
              // Only keep values that exactly match one of the allowed options
              values = values.filter(v => field.options!.includes(v));
              console.log(`[extractFields] Validated ${field.key}: original=${JSON.stringify(extracted[field.key])}, filtered=${JSON.stringify(values)}`);
            }

            if (values.length > 0) {
              result[field.key] = values;
            }
          } else {
            // Regular text field
            result[field.key] = String(extracted[field.key]);
          }
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
  fields: Record<string, string | string[]>,
  requiredFields: Field[]
): boolean {
  return requiredFields
    .filter(f => f.required)
    .every(f => {
      const value = fields[f.key];
      if (!value) return false;

      // For array fields (multiselect), check if array has at least one item
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      // For string fields, check if non-empty
      return value.trim().length > 0;
    });
}
