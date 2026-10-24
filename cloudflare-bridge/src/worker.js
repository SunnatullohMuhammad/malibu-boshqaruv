const SITE_ORIGIN = "https://sunnatullohmuhammad.github.io";
const COMMANDS = new Set(["START", "STOP", "LOCK", "UNLOCK", "ALARM", "TRUNK"]);

function json(data, status = 200, origin = SITE_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "vary": "Origin"
    }
  });
}

function authorized(request, env) {
  const expected = `Bearer ${env.CONTROL_TOKEN || ""}`;
  const actual = request.headers.get("authorization") || "";
  return env.CONTROL_TOKEN && actual.length === expected.length && actual === expected;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    if (origin && origin !== SITE_ORIGIN) return json({ error: "origin_not_allowed" }, 403, SITE_ORIGIN);
    if (request.method === "OPTIONS") return json({}, 200, SITE_ORIGIN);
    if (!authorized(request, env)) return json({ error: "unauthorized" }, 401, SITE_ORIGIN);
    const id = env.CAR.idFromName("cobalt-main");
    return env.CAR.get(id).fetch(request);
  }
};

export class CarControl {
  constructor(state) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      this.queue = (await state.storage.get("queue")) || [];
      this.car = (await state.storage.get("car")) || { connected: false, ignition: false, locked: false, alarm: false, lastSeen: 0 };
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/state") {
      const lastSeen = Number(this.car.lastSeen || 0);
      return json({ ...this.car, connected: Date.now() - lastSeen < 45000 });
    }
    if (request.method === "POST" && url.pathname === "/api/command") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }
      if (!COMMANDS.has(body.command)) return json({ error: "bad_command" }, 400);
      if (this.queue.length >= 20) return json({ error: "queue_full" }, 429);
      const id = crypto.randomUUID();
      this.queue.push({ id, command: body.command, createdAt: Date.now() });
      await this.state.storage.put("queue", this.queue);
      return json({ accepted: true, id, command: body.command }, 202);
    }
    if (request.method === "GET" && url.pathname === "/api/next") {
      this.car.lastSeen = Date.now();
      await this.state.storage.put("car", this.car);
      return json({ command: this.queue[0] || null });
    }
    if (request.method === "POST" && url.pathname === "/api/ack") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }
      const item = this.queue[0];
      if (!item || item.id !== body.id || !COMMANDS.has(body.command)) return json({ error: "queue_mismatch" }, 409);
      this.queue.shift();
      const c = body.command;
      if (c === "START") this.car.ignition = true;
      if (c === "STOP") this.car.ignition = false;
      if (c === "LOCK") { this.car.locked = true; this.car.alarm = false; }
      if (c === "UNLOCK") { this.car.locked = false; this.car.alarm = false; }
      if (c === "ALARM") { this.car.locked = true; this.car.alarm = true; }
      this.car.lastSeen = Date.now();
      await this.state.storage.put({ queue: this.queue, car: this.car });
      return json({ acknowledged: true });
    }
    return json({ error: "not_found" }, 404);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": SITE_ORIGIN, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "authorization, content-type", "vary": "Origin" } });
}

