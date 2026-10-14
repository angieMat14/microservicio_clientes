require('dotenv').config();
const { MongoClient } = require('mongodb');
const data = require('./clientes.json');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const col = client.db(process.env.DB_NAME).collection('clientes');
  await col.deleteMany({});
  await col.insertMany(data);
  await col.createIndex({ id: 1 }, { unique: true });
  console.log('Insertados:', await col.countDocuments());
  await client.close();
})();