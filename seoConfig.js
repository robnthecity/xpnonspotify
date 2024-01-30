// seoConfig.js
import fs from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Correctly import dirname from the 'path' module, not from 'url'
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadSEOConfig() {
  try {
    const seoData = await fs.readFile(join(__dirname, 'src/seo.json'), 'utf8');
    return JSON.parse(seoData);
  } catch (err) {
    console.error('Error reading SEO configuration:', err);
    return {}; // Default to an empty object in case of an error
  }
}
