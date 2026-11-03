import { createAppServer } from '../src/server.js';

let serverPromise;
export default async function handler(req, res) {
  serverPromise ||= createAppServer().then((server) => new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  }));
  const server = await serverPromise;
  server.emit('request', req, res);
}
