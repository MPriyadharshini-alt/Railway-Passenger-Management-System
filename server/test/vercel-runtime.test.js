const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

test('Express app can be imported without starting a persistent server', () => {
  const originalListen = http.Server.prototype.listen;
  let listenCalled = false;
  http.Server.prototype.listen = function (...args) {
    listenCalled = true;
    return originalListen.apply(this, args);
  };

  try {
    const app = require('../src/server');
    assert.equal(typeof app, 'function');
    assert.equal(listenCalled, false);
  } finally {
    http.Server.prototype.listen = originalListen;
  }
});

test('root Vercel entrypoint exports the existing Express app', () => {
  const app = require('../src/server');
  const vercelHandler = require('../../server');
  assert.equal(vercelHandler, app);
});

test('serverless Express handler preserves the /api health route', async () => {
  const vercelHandler = require('../../server');
  const server = http.createServer(vercelHandler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.status, 'unavailable');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
