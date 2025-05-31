// server/rooms.js

export async function assignRoom(playerA, playerB, env) {
  const roomId = `room-${playerA.id}-${playerB.id}`; // Use player ids for uniqueness
  const id = env.ROOM_DO.idFromName(roomId);
  const stub = env.ROOM_DO.get(id);

  await stub.fetch(`https://room/init`, {
    method: 'POST',
    body: JSON.stringify({
      playerA,
      playerB,
      roomId
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return roomId;
}
