import { Router, Request, Response } from 'express';
import type { ChatRequest, NavigateRequest } from './types.js';
import {
  getOrCreateSession,
  getSession,
  updateSession
} from './graph/stateManager.js';
import { processMessage, initializeSession } from './graph/topicGraph.js';
import { generateDocx } from './docx.js';
import {
  loadConfig,
  listConfigs,
  setCurrentConfig,
  getCurrentConfigName,
  getTopicById
} from './config/loader.js';

const router = Router();

// POST /api/chat - Process user message
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body as ChatRequest;

    let state = getOrCreateSession(sessionId);
    let reply: string;

    // If it's a new session (no messages yet), initialize it
    if (!sessionId || state.topics[state.activeTopicId].transcript.length === 0) {
      const result = await initializeSession(state);
      state = result.state;
      reply = result.reply;
      updateSession(state.sessionId, state);
    } else {
      // Process the user message
      const result = await processMessage(state, message);
      state = result.state;
      reply = result.reply;
      updateSession(state.sessionId, state);
    }

    res.json({
      sessionId: state.sessionId,
      reply,
      state
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// GET /api/session/:id - Get session state
router.get('/session/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const state = getSession(id);

    if (!state) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ state });
  } catch (error) {
    console.error('Error in /api/session/:id:', error);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// POST /api/navigate - Navigate to a different topic
router.post('/navigate', async (req: Request, res: Response) => {
  try {
    const { sessionId, topicId } = req.body as NavigateRequest;
    const state = getSession(sessionId);

    if (!state) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const targetTopic = state.topics[topicId];
    if (!targetTopic) {
      return res.status(400).json({ error: 'Invalid topic ID' });
    }

    if (state.activeTopicId === topicId) {
      return res.json({ state, message: 'Already on target topic' });
    }

    // Only allow navigation to completed topics
    if (targetTopic.status !== 'Complete') {
      return res.status(403).json({ error: 'Cannot navigate to incomplete topic' });
    }

    const previousTopicId = state.activeTopicId;
    state.resumeTopicId = previousTopicId !== topicId ? previousTopicId : null;
    state.revisitingTopicId = topicId;
    state.activeTopicId = topicId;
    state.done = false;

    targetTopic.status = 'InProgress';
    targetTopic.revisitCount = (targetTopic.revisitCount ?? 0) + 1;

    const topicConfig = getTopicById(topicId);
    const acknowledgement = topicConfig
      ? `No worries, keen to revisit ${topicConfig.title}. What would you like to change?`
      : 'No worries, keen to revisit this topic. What would you like to change?';

    targetTopic.transcript.push({
      role: 'assistant',
      text: acknowledgement
    });

    updateSession(sessionId, state);

    res.json({
      state,
      message: acknowledgement
    });
  } catch (error) {
    console.error('Error in /api/navigate:', error);
    res.status(500).json({ error: 'Failed to navigate' });
  }
});

// POST /api/docx - Generate and download DOCX
router.post('/docx', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const state = getSession(sessionId);

    if (!state) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!state.done) {
      return res.status(400).json({ error: 'Session not complete yet' });
    }

    const buffer = await generateDocx(state);
    const config = loadConfig();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${config.docx.fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error in /api/docx:', error);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

// GET /api/config - Get app configuration (for frontend)
router.get('/config', (req: Request, res: Response) => {
  try {
    const config = loadConfig();
    res.json(config);
  } catch (error) {
    console.error('Error in /api/config:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// GET /api/configs/list - List all available configs
router.get('/configs/list', (req: Request, res: Response) => {
  try {
    const configs = listConfigs();
    const currentConfig = getCurrentConfigName();
    res.json({ configs, currentConfig });
  } catch (error) {
    console.error('Error in /api/configs/list:', error);
    res.status(500).json({ error: 'Failed to list configurations' });
  }
});

// POST /api/configs/switch - Switch to a different config
router.post('/configs/switch', (req: Request, res: Response) => {
  try {
    const { configName } = req.body;

    if (!configName) {
      return res.status(400).json({ error: 'configName is required' });
    }

    // Verify config exists
    const availableConfigs = listConfigs();
    if (!availableConfigs.includes(configName)) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    setCurrentConfig(configName);
    const config = loadConfig(configName);

    res.json({
      success: true,
      currentConfig: configName,
      config
    });
  } catch (error) {
    console.error('Error in /api/configs/switch:', error);
    res.status(500).json({ error: 'Failed to switch configuration' });
  }
});

export default router;
