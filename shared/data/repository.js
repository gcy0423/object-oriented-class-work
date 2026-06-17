export class Repository {
  constructor(database, collectionName, factory) {
    this.database = database;
    this.collectionName = collectionName;
    this.factory = factory;
  }

  all() {
    return this.database.collection(this.collectionName).map((record) => this.factory(record));
  }

  findById(id) {
    const record = this.database.collection(this.collectionName).find((item) => item.id === id);
    return record ? this.factory(record) : null;
  }

  where(predicate) {
    return this.all().filter(predicate);
  }

  async save(entity) {
    const collection = this.database.collection(this.collectionName);
    const record = entity.toJSON ? entity.toJSON() : entity;
    const index = collection.findIndex((item) => item.id === record.id);
    if (index >= 0) {
      collection[index] = record;
    } else {
      collection.push(record);
    }
    await this.database.save();
    return this.factory(record);
  }

  async remove(id) {
    const collection = this.database.collection(this.collectionName);
    const index = collection.findIndex((item) => item.id === id);
    if (index >= 0) {
      collection.splice(index, 1);
      await this.database.save();
      return true;
    }
    return false;
  }
}
