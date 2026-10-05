import { Router } from 'express';
import { knowledgeController } from '../controllers/knowledge.controller';

export const knowledgeRouter = Router();

// POST /api/knowledge/seed - Idempotently seeds knowledge documents with embeddings into Elasticsearch
knowledgeRouter.post('/seed', (req, res) => knowledgeController.seedKnowledge(req, res));

// GET /api/knowledge/stats - Returns vector index chunk count and configuration
knowledgeRouter.get('/stats', (req, res) => knowledgeController.getKnowledgeStats(req, res));
