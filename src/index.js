export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/sync") {
      // Client POSTs { docId, deltas, baseVersion }
      const { docId } = await request.json();

      // Locate Durable Object by docId
      const id = env.MY_DO_NAMESPACE.idFromName(docId);
      const stub = env.MY_DO_NAMESPACE.get(id);

      // Forward request to Durable Object
      return await stub.fetch(request);

    } else if (path === "/kv") {
      // Example: Write & read from KV
      await env.MY_KV.put("my-key", "Hello from KV!");
      const value = await env.MY_KV.get("my-key");
      return new Response(`KV Value: ${value}`);
    } else if (path === "/d1") {
      // Example: Query D1 database
      const { results } = await env.MY_D1.prepare("SELECT * FROM my_table").all();
      return new Response(JSON.stringify(results, null, 2), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};

// Durable Object: Handles stateful sync with delta updates
export class MyDurableObject {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const { deltas, baseVersion } = await request.json();

    // Retrieve current state/version
    const currentState = await this.state.storage.get("state") || {};
    const currentVersion = await this.state.storage.get("version") || 0;

    // Client is out-of-date: return conflict + current state
    if (baseVersion < currentVersion) {
      return new Response(JSON.stringify({
        error: "out-of-sync",
        currentState,
        currentVersion
      }), { status: 409 });
    }

    // Apply deltas to state
    for (const delta of deltas) {
      if (delta.op === "add" || delta.op === "update") {
        currentState[delta.key] = delta.value;
      } else if (delta.op === "delete") {
        delete currentState[delta.key];
      }
    }

    // Increment version
    const newVersion = currentVersion + 1;
    await this.state.storage.put("state", currentState);
    await this.state.storage.put("version", newVersion);

    return new Response(JSON.stringify({
      success: true,
      newVersion,
      newState: currentState
    }), { headers: { "Content-Type": "application/json" } });
  }
}