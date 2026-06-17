export class Entity {
  constructor(record) {
    this.id = record.id;
    this.createdAt = record.createdAt || new Date().toISOString();
    this.updatedAt = record.updatedAt || this.createdAt;
  }

  touch() {
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    const json = {};
    for (const key of Object.keys(this)) {
      json[key] = this[key];
    }
    return json;
  }
}
