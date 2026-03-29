"""
backend/routers/websocket.py — Real-Time WebSocket Feed
=========================================================
WebSocket endpoint for broadcasting live events to all connected clients.
Broadcasts: new listings, claims, and pickups.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# ── Connection Manager ────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.disconnect(d)

manager = ConnectionManager()


# ── WebSocket Endpoint ────────────────────────────────────────────
@router.websocket("/ws/feed")
async def websocket_feed(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send a welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to FoodBridge live feed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "active_clients": len(manager.active_connections),
        })

        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()
            # Client can send events to broadcast
            try:
                event = json.loads(data)
                event["timestamp"] = datetime.now(timezone.utc).isoformat()
                event["active_clients"] = len(manager.active_connections)
                await manager.broadcast(event)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── HTTP endpoint to trigger broadcasts (used by other routers) ──
@router.post("/broadcast")
async def broadcast_event(event: dict):
    event["timestamp"] = datetime.now(timezone.utc).isoformat()
    event["active_clients"] = len(manager.active_connections)
    await manager.broadcast(event)
    return {
        "message": "Event broadcast",
        "active_clients": len(manager.active_connections),
    }
