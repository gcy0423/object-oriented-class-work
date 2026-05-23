import { EventEmitter } from "node:events";

export class DomainEventBus extends EventEmitter {
  publish(type, payload) {
    const event = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      payload,
      occurredAt: new Date().toISOString()
    };
    this.emit(type, event);
    this.emit("*", event);
    return event;
  }
}

export class SyncHub {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.clients = new Set();
    this.listener = (event) => this.broadcast(event);
    this.eventBus.on("*", this.listener);
  }

  handleSse(req, res) {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    const client = { res };
    this.clients.add(client);
    req.on("close", () => this.clients.delete(client));
  }

  broadcast(event) {
    const line = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      client.res.write(line);
    }
  }
}
