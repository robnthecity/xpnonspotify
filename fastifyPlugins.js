// fastifyPlugins.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Static from '@fastify/static';
import Formbody from '@fastify/formbody';
import View from '@fastify/view';
import Handlebars from 'handlebars';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function (fastify) {
  fastify.register(Static, {
    root: join(__dirname, 'public'),
    prefix: '/'
  }).register(Formbody)
    .register(View, {
      engine: {
        handlebars: Handlebars
      },
      root: join(__dirname, 'src/pages')
    });
}
