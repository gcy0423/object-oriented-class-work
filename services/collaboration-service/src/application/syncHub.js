export class SyncHub {
  constructor() {
    this.clients = new Set();
  }

  connect(res) {
    this.clients.add(res);
  }

  disconnect(res) {
    this.clients.delete(res);
  }

  broadcast(type, payload) {
    const body = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(body);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}
