import { ChatOpenAI } from '@langchain/openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const llm = new ChatOpenAI({
  modelName: 'gpt-5-nano',
  modelKwargs: {
    reasoning_effort: 'minimal'
  },
  openAIApiKey: process.env.OPENAI_API_KEY
});
