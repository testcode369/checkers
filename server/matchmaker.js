const QUEUE = [];
const PENDING_INVITES = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/match' && request.method === 'POST') {
      const { name, id } = await request.json();

      if (QUEUE.length > 0) {
        const opponent = QUEUE.shift();
        const roomId = crypto.randomUUID();
        const roomStub = env.ROOM.get(env.ROOM.idFromName(roomId));

        await roomStub.fetch('https://init', {
          method: 'POST',
          body: JSON.stringify({
            playerA: opponent,
            playerB: { id, name },
          }),
        });

        return new Response(JSON.stringify({
          matched: true,
          room: roomId,
          color: 'blue',
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        QUEUE.push({ id, name });
        return new Response(JSON.stringify({ matched: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/invite' && request.method === 'POST') {
      const { inviter } = await request.json();
      if (!inviter?.id || !inviter?.name) {
        return new Response(JSON.stringify({ error: 'Missing inviter info' }), { status: 400 });
      }

      const roomId = crypto.randomUUID();
      PENDING_INVITES.set(roomId, inviter);

      return new Response(JSON.stringify({
        inviteLink: `/accept/${roomId}`, // or use query param if you prefer
        room: roomId,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/accept' && request.method === 'POST') {
      const { invitee, room } = await request.json();
      if (!invitee?.id || !invitee?.name || !room || !PENDING_INVITES.has(room)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid invite' }), {
          status: 400,
        });
      }

      const inviter = PENDING_INVITES.get(room);
      const roomStub = env.ROOM.get(env.ROOM.idFromName(room));

      await roomStub.fetch('https://init', {
        method: 'POST',
        body: JSON.stringify({
          playerA: inviter,
          playerB: invitee,
        }),
      });

      PENDING_INVITES.delete(room);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found  2', { status: 404 });
  },
};
