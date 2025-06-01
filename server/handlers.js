// server/handlers.js
export async function handleJoin(request, env, ctx) {
  const { playerId, roomId } = await request.json();

  const id = env.ROOM.idFromName(roomId);
  const stub = env.ROOM.get(id);

  // Forward join to Room Durable Object
  return await stub.fetch(new Request('https://join', {
    method: 'POST',
    body: JSON.stringify({ playerId }),
    headers: { 'Content-Type': 'application/json' }
  }));
}

export async function handleMove(request, env, ctx) {
  const { playerId, roomId, move } = await request.json();

  const id = env.ROOM.idFromName(roomId);
  const stub = env.ROOM.get(id);

  return await stub.fetch(new Request('https://move', {
    method: 'POST',
    body: JSON.stringify({ playerId, move }),
    headers: { 'Content-Type': 'application/json' }
  }));
}

export async function handleSpectate(request, env, ctx) {
  const { roomId } = await request.json();

  const id = env.ROOM.idFromName(roomId);
  const stub = env.ROOM.get(id);

  return await stub.fetch(new Request('https://spectate', {
    method: 'POST',
    body: JSON.stringify({ roomId }),
    headers: { 'Content-Type': 'application/json' }
  }));
}
