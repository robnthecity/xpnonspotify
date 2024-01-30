// server.js
import dotenv from 'dotenv';
import Fastify from 'fastify';
import setupFastifyPlugins from './fastifyPlugins.js';
import { loadSEOConfig } from './seoConfig.js';
import setupGeneralRoutes from './generalRoutes.js';
import wxpnRoutes from './wxpnRoutes.js';
import spotifyRoutes from './spotifyRoutes.js';
import db from './db.js';

// Initialize dotenv
dotenv.config();

async function init() {
  const fastify = Fastify({ logger: true });

  await setupFastifyPlugins(fastify); // Ensure that this is awaited if it's async

  const seo = await loadSEOConfig(); // Make sure loadSEOConfig is an async function

  // Register Spotify routes
  fastify.register(spotifyRoutes);

  // Register WXPN routes
  fastify.register(wxpnRoutes, { db });

  // Register general routes
  setupGeneralRoutes(fastify, seo); // Ensure that this is awaited if it's async

  try {
    const address = await fastify.listen({ port: process.env.PORT, host: '0.0.0.0' });
    console.log(`Server listening on ${address}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

init().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});
