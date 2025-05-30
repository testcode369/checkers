export async function assignRoom(playerA, playerB, env) {
  const roomId = `room-${playerA}-${playerB}`;
  const id = env.ROOM_DO.idFromName(roomId);
  const stub = env.ROOM_DO.get(id);

  await stub.fetch(`https://room/init`, {
    method: 'POST',
    body: JSON.stringify({ playerA, playerB })
  });

  return roomId;
}