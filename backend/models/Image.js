import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const imageSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MongooseImage = mongoose.model('Image', imageSchema);

const DB_FILE = path.join(process.cwd(), 'local_db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
};

const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

class MockImage {
  constructor(data) {
    this._id = Math.random().toString(36).substring(2, 9);
    this.fileName = data.fileName;
    this.imageUrl = data.imageUrl;
    this.createdAt = new Date().toISOString();
  }

  async save() {
    const db = readDB();
    db.push(this);
    writeDB(db);
    return this;
  }

  static find() {
    const db = readDB();
    let isSorted = false;

    const query = {
      sort(options) {
        isSorted = true;
        return this;
      },
      then(resolve) {
        const result = [...db];
        if (isSorted) {
          result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        resolve(result);
      }
    };
    return query;
  }

  static async findById(id) {
    const db = readDB();
    return db.find(img => img._id === id) || null;
  }

  static async findByIdAndDelete(id) {
    const db = readDB();
    const index = db.findIndex(img => img._id === id);
    if (index !== -1) {
      db.splice(index, 1);
      writeDB(db);
    }
  }
}

const ImageProxy = new Proxy(class {}, {
  get(target, prop) {
    if (global.useLocalDB) {
      if (prop === 'prototype') return MockImage.prototype;
      return MockImage[prop];
    }
    if (prop === 'prototype') return MongooseImage.prototype;
    return MongooseImage[prop];
  },
  construct(target, args) {
    if (global.useLocalDB) {
      return new MockImage(...args);
    }
    return new MongooseImage(...args);
  }
});

export default ImageProxy;
