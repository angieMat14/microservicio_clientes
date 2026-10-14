require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
let col;

const err = (res, status, error, message) =>
  res.status(status).json({ error, message });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactCI = (v) => new RegExp(`^${escapeRegex(v)}$`, 'i');

app.get('/health', async (req, res) => {
  try {
    await col.estimatedDocumentCount();
    res.json({
      status: 'ok',
      service: 'grupo-MS-clientes',
      collection: 'clientes',
      version: '1.0.0',
    });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

app.get('/items', async (req, res) => {
  try {
    const { ciudad, provincia } = req.query;
    let limit = 20;
    let offset = 0;

    if (req.query.limit !== undefined) {
      if (!/^\d+$/.test(req.query.limit)) {
        return err(res, 400, 'bad_request', 'El parámetro limit debe ser un entero.');
      }
      limit = parseInt(req.query.limit, 10);
      if (limit < 1 || limit > 100) {
        return err(res, 400, 'bad_request', 'El parámetro limit debe estar entre 1 y 100.');
      }
    }

    if (req.query.offset !== undefined) {
      if (!/^\d+$/.test(req.query.offset)) {
        return err(res, 400, 'bad_request', 'El parámetro offset debe ser un entero >= 0.');
      }
      offset = parseInt(req.query.offset, 10);
    }

    const filter = {};
    if (ciudad) filter.ciudad = exactCI(ciudad);
    if (provincia) filter.provincia = exactCI(provincia);

    const [items, total] = await Promise.all([
      col
        .find(filter, { projection: { _id: 0 } })
        .sort({ id: 1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ]);

    res.json({ items, total, limit, offset });
  } catch (e) {
    err(res, 500, 'bad_request', 'Error interno.');
  }
});

app.get('/items/:id', async (req, res) => {
  try {
    const item = await col.findOne(
      { id: req.params.id },
      { projection: { _id: 0 } }
    );
    if (!item) {
      return err(res, 404, 'not_found', `No existe ${req.params.id}.`);
    }
    res.json(item);
  } catch {
    err(res, 500, 'bad_request', 'Error interno.');
  }
});

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  col = client.db(process.env.DB_NAME).collection('clientes');
  app.listen(PORT, () => console.log(`Servicio en puerto ${PORT}`));
})();