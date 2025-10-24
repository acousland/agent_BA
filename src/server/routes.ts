import { Router, Request, Response } from 'express';
import type { ChatRequest, NavigateRequest } from './types.js';
import {
  getOrCreateSession,
  getSession,
  updateSession
} from './graph/stateManager.js';
import { processMessage, initializeSession } from './graph/topicGraph.js';
import { generateDocx } from './docx.js';
import { loadConfig } from './config/loader.js';

const router = Router();

// POST /api/chat - Process user message
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body as ChatRequest;

    let state = getOrCreateSession(sessionId);
    let reply: string;

    // If it's a new session (no messages yet), initialize it
    const currentStepData = state.steps[state.activeStepId];
    const currentTopicData = currentStepData?.topics[state.activeTopicId];
    const isNewSession = !sessionId || !currentTopicData || currentTopicData.transcript.length === 0;

    if (isNewSession) {
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
    const { sessionId, stepId, topicId } = req.body as NavigateRequest;
    const state = getSession(sessionId);

    if (!state) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const targetStep = state.steps[stepId];
    if (!targetStep) {
      return res.status(400).json({ error: 'Invalid step ID' });
    }

    const targetTopic = targetStep.topics[topicId];
    if (!targetTopic) {
      return res.status(400).json({ error: 'Invalid topic ID' });
    }

    // Only allow navigation to completed topics
    if (targetTopic.status !== 'Complete') {
      return res.status(403).json({ error: 'Cannot navigate to incomplete topic' });
    }

    // Update active step and topic
    state.activeStepId = stepId;
    state.activeTopicId = topicId;
    updateSession(sessionId, state);

    res.json({
      state,
      message: `Navigated to topic: ${topicId}`
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

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="initiative-summary.docx"`);
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

export default router;
