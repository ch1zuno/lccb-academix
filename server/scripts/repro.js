import express from 'express';
import router from '../routes/index.js';

const app = express();
app.use('/api', router);
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

const server = app.listen(4010, async () => {
  const res = await fetch('http://localhost:4010/api/referrals');
  const body = await res.json();
  console.log('no-token response:', res.status, JSON.stringify(body));
  server.close();
});
