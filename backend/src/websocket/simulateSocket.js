'use strict';

/**
 * WebSocket Manager — AeroTwin-Habitat
 *
 * Manages ws.Server instance attached to the HTTP server.
 * Clients connect to: ws://host/ws/simulate/:runId
 * or                  ws://host/ws/simulate/:optimizationRunId
 *
 * Supports broadcasting progress events from worker threads to subscribed clients.
 */

const WebSocket = require('ws');
const { URL }   = require('url');

// Map: runId → Set<WebSocket>
const subscribers = new Map();

let wss;

/**
 * Initialize the WebSocket server attached to an existing HTTP server.
 * @param {http.Server} server
 */
function init(server) {
  wss = new WebSocket.Server({ server, path: '/ws/simulate' });

  wss.on('connection', (ws, req) => {
    // Extract runId from URL: /ws/simulate/:runId
    let runId;
    try {
      const url  = new URL(req.url, `http://${req.headers.host}`);
      const parts = url.pathname.split('/');
      runId = parts[parts.length - 1]; // last segment
    } catch (_) {}

    if (!runId) {
      ws.close(1008, 'Missing runId in URL path');
      return;
    }

    // Subscribe
    if (!subscribers.has(runId)) subscribers.set(runId, new Set());
    subscribers.get(runId).add(ws);

    ws.send(JSON.stringify({ type: 'subscribed', runId }));

    ws.on('close', () => {
      const set = subscribers.get(runId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) subscribers.delete(runId);
      }
    });

    ws.on('error', (err) => {
      console.warn(`WebSocket error for runId=${runId}:`, err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('WebSocket server error:', err.message);
  });

  return wss;
}

/**
 * Broadcast a message to all WebSocket clients subscribed to a runId.
 * @param {string} runId
 * @param {object} message
 */
function broadcast(runId, message) {
  const set = subscribers.get(runId);
  if (!set || set.size === 0) return;

  const payload = JSON.stringify(message);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Return the count of connected subscribers for a runId.
 */
function subscriberCount(runId) {
  return subscribers.get(runId)?.size || 0;
}

module.exports = { init, broadcast, subscriberCount };
