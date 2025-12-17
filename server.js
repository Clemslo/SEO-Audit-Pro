// Backend minimal pour gérer les reward sessions
// Installation: npm install express cors dotenv
// Usage: node server.js

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Stockage en mémoire des sessions (dans un vrai projet, utilisez une base de données)
const rewardSessions = new Map();

// Générer un ID de session unique
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// POST /reward/start - Créer une nouvelle reward session
app.post('/reward/start', (req, res) => {
  try {
    const { pageKey, userAgent, timestamp } = req.body;

    if (!pageKey) {
      return res.status(400).json({ 
        error: 'pageKey est requis' 
      });
    }

    const sessionId = generateSessionId();
    
    // Créer la session
    rewardSessions.set(sessionId, {
      sessionId,
      pageKey,
      userAgent: userAgent || req.headers['user-agent'],
      createdAt: timestamp || new Date().toISOString(),
      confirmed: false,
      confirmedAt: null
    });

    // Nettoyer les sessions expirées (plus de 1 heure)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, session] of rewardSessions.entries()) {
      const sessionTime = new Date(session.createdAt).getTime();
      if (sessionTime < oneHourAgo) {
        rewardSessions.delete(id);
      }
    }

    console.log(`[${new Date().toISOString()}] Nouvelle session créée: ${sessionId} pour pageKey: ${pageKey}`);

    res.json({ 
      success: true,
      sessionId 
    });
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la création de la session' 
    });
  }
});

// POST /reward/confirm - Confirmer qu'un reward a été accordé
app.post('/reward/confirm', (req, res) => {
  try {
    const { sessionId, pageKey, watchTime, adStartTime } = req.body;

    if (!sessionId || !pageKey) {
      return res.status(400).json({ 
        error: 'sessionId et pageKey sont requis' 
      });
    }

    // Vérifier que la session existe
    const session = rewardSessions.get(sessionId);

    if (!session) {
      console.warn(`[${new Date().toISOString()}] Tentative de confirmation d'une session inexistante: ${sessionId}`);
      return res.status(404).json({ 
        error: 'Session non trouvée ou expirée' 
      });
    }

    // Vérifier que la pageKey correspond
    if (session.pageKey !== pageKey) {
      console.warn(`[${new Date().toISOString()}] Tentative de confirmation avec une pageKey incorrecte pour session: ${sessionId}`);
      return res.status(403).json({ 
        error: 'PageKey ne correspond pas à la session' 
      });
    }

    // Vérifier que la session n'a pas déjà été confirmée
    if (session.confirmed) {
      console.warn(`[${new Date().toISOString()}] Tentative de double confirmation pour session: ${sessionId}`);
      return res.status(409).json({ 
        error: 'Cette session a déjà été confirmée' 
      });
    }

    // Vérifier que la session n'est pas trop ancienne (max 10 minutes)
    const sessionTime = new Date(session.createdAt).getTime();
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    if (now - sessionTime > maxAge) {
      console.warn(`[${new Date().toISOString()}] Tentative de confirmation d'une session expirée: ${sessionId}`);
      rewardSessions.delete(sessionId);
      return res.status(410).json({ 
        error: 'Session expirée' 
      });
    }

    // VALIDATION : Vérifier que la publicité a été regardée pendant au moins 30 secondes
    const MINIMUM_WATCH_TIME = 30; // 30 secondes minimum
    
    if (watchTime !== undefined) {
      if (watchTime < MINIMUM_WATCH_TIME) {
        console.warn(`[${new Date().toISOString()}] Tentative de confirmation avec durée insuffisante: ${watchTime}s (minimum: ${MINIMUM_WATCH_TIME}s) pour session: ${sessionId}`);
        return res.status(400).json({ 
          error: `Durée de visionnage insuffisante (${watchTime}s/${MINIMUM_WATCH_TIME}s minimum requis)`,
          watchTime: watchTime,
          minimumRequired: MINIMUM_WATCH_TIME
        });
      }
    }

    // Validation supplémentaire : Vérifier le temps écoulé depuis le début de la pub
    if (adStartTime) {
      const actualElapsedTime = (now - adStartTime) / 1000; // en secondes
      if (actualElapsedTime < MINIMUM_WATCH_TIME) {
        console.warn(`[${new Date().toISOString()}] Tentative de confirmation trop rapide: ${actualElapsedTime}s (minimum: ${MINIMUM_WATCH_TIME}s) pour session: ${sessionId}`);
        return res.status(400).json({ 
          error: `Temps de visionnage insuffisant (${Math.round(actualElapsedTime)}s/${MINIMUM_WATCH_TIME}s minimum requis)`,
          elapsedTime: Math.round(actualElapsedTime),
          minimumRequired: MINIMUM_WATCH_TIME
        });
      }
    }

    // Confirmer la session
    session.confirmed = true;
    session.confirmedAt = new Date().toISOString();
    session.watchTime = watchTime || null;
    session.adStartTime = adStartTime || null;
    rewardSessions.set(sessionId, session);

    console.log(`[${new Date().toISOString()}] Session confirmée: ${sessionId} pour pageKey: ${pageKey} (durée: ${watchTime || 'N/A'}s)`);

    res.json({ 
      success: true,
      sessionId,
      confirmedAt: session.confirmedAt,
      watchTime: watchTime
    });
  } catch (error) {
    console.error('Erreur lors de la confirmation du reward:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la confirmation' 
    });
  }
});

// GET /reward/status/:sessionId - Vérifier le statut d'une session (optionnel)
app.get('/reward/status/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = rewardSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ 
        error: 'Session non trouvée' 
      });
    }

    res.json({
      sessionId: session.sessionId,
      pageKey: session.pageKey,
      confirmed: session.confirmed,
      createdAt: session.createdAt,
      confirmedAt: session.confirmedAt
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    res.status(500).json({ 
      error: 'Erreur serveur' 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions: rewardSessions.size
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur le port ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   POST /reward/start - Créer une session`);
  console.log(`   POST /reward/confirm - Confirmer un reward`);
  console.log(`   GET /reward/status/:sessionId - Vérifier le statut`);
  console.log(`   GET /health - Health check`);
});

