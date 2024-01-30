// generalRoutes.js
export default async function (fastify, seo) {
  fastify.get('/wakeup', async (req, reply) => reply.send('Waking up...'));
  fastify.get('/', async (req, reply) => reply.view('/src/pages/index.hbs', { seo }));
  fastify.post('/', (request, reply) => reply.view('/src/pages/index.hbs', { seo }));
}
