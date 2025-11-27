/**
 * Bot Management Routes
 * CRUD operations for bots
 */

import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';

const router = Router();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

/**
 * GET /api/bots
 * Get all bots for a user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const botsRef = db.collection('bots');
    const snapshot = await botsRef.where('userId', '==', userId).get();

    const bots = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ bots });
  } catch (error: any) {
    console.error('Error fetching bots:', error);
    res.status(500).json({ error: 'Failed to fetch bots', message: error.message });
  }
});

/**
 * GET /api/bots/:id
 * Get a single bot by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const botDoc = await db.collection('bots').doc(id).get();

    if (!botDoc.exists) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({
      id: botDoc.id,
      ...botDoc.data(),
    });
  } catch (error: any) {
    console.error('Error fetching bot:', error);
    res.status(500).json({ error: 'Failed to fetch bot', message: error.message });
  }
});

/**
 * POST /api/bots
 * Create a new bot
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, systemPrompt, model, userId, knowledgeBase } = req.body;

    if (!name || !systemPrompt || !userId) {
      return res.status(400).json({ error: 'name, systemPrompt, and userId are required' });
    }

    const botData = {
      name,
      systemPrompt,
      model: model || 'gpt-4o-mini',
      userId,
      knowledgeBase: knowledgeBase || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('bots').add(botData);

    res.status(201).json({
      id: docRef.id,
      ...botData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error creating bot:', error);
    res.status(500).json({ error: 'Failed to create bot', message: error.message });
  }
});

/**
 * PUT /api/bots/:id
 * Update a bot
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, systemPrompt, model, knowledgeBase } = req.body;

    const botRef = db.collection('bots').doc(id);
    const botDoc = await botRef.get();

    if (!botDoc.exists) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name) updateData.name = name;
    if (systemPrompt) updateData.systemPrompt = systemPrompt;
    if (model) updateData.model = model;
    if (knowledgeBase !== undefined) updateData.knowledgeBase = knowledgeBase;

    await botRef.update(updateData);

    res.json({
      id,
      ...botDoc.data(),
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating bot:', error);
    res.status(500).json({ error: 'Failed to update bot', message: error.message });
  }
});

/**
 * DELETE /api/bots/:id
 * Delete a bot
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const botRef = db.collection('bots').doc(id);
    const botDoc = await botRef.get();

    if (!botDoc.exists) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    await botRef.delete();

    res.json({ message: 'Bot deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting bot:', error);
    res.status(500).json({ error: 'Failed to delete bot', message: error.message });
  }
});

export default router;
