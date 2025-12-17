# Backend Reward Sessions

Backend minimal pour gérer les sessions de reward AdMob pour l'extension SEO Dashboard.

## Installation

```bash
cd backend
npm install
```

## Configuration

Créez un fichier `.env` (optionnel) :

```env
PORT=3000
NODE_ENV=development
```

## Démarrage

```bash
# Mode production
npm start

# Mode développement (avec auto-reload)
npm run dev
```

## Endpoints

### POST /reward/start
Crée une nouvelle session de reward.

**Body:**
```json
{
  "pageKey": "https://example.com/page",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123"
}
```

### POST /reward/confirm
Confirme qu'un reward a été accordé.

**Body:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "pageKey": "https://example.com/page"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123",
  "confirmedAt": "2024-01-01T00:05:00.000Z"
}
```

### GET /reward/status/:sessionId
Vérifie le statut d'une session.

**Response:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "pageKey": "https://example.com/page",
  "confirmed": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "confirmedAt": "2024-01-01T00:05:00.000Z"
}
```

### GET /health
Health check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "activeSessions": 5
}
```

## Sécurité

⚠️ **Important:** Ce backend est minimal et destiné au développement. Pour la production :

1. Ajoutez une authentification (API keys, JWT, etc.)
2. Utilisez une base de données persistante (PostgreSQL, MongoDB, etc.)
3. Implémentez un rate limiting
4. Ajoutez des logs structurés
5. Utilisez HTTPS
6. Validez et sanitize toutes les entrées
7. Implémentez une protection CSRF

## Notes

- Les sessions sont stockées en mémoire et expirées après 1 heure
- Les sessions confirmées ne peuvent pas être confirmées à nouveau
- Les sessions expirent après 10 minutes si non confirmées


