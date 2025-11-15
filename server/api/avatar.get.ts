// File: server/api/avatar.get.ts

import { defineEventHandler, getQuery, setHeader } from 'h3';
import { createAvatar } from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
import * as bottts from '@dicebear/bottts';
import * as micah from '@dicebear/micah';
import * as miniavs from '@dicebear/miniavs';
import * as pixelArt from '@dicebear/pixel-art';
import * as lorelei from '@dicebear/lorelei';

// Map of available styles for safe selection.
const styles = {
  adventurer,
  bottts,
  micah,
  miniavs,
  'pixel-art': pixelArt,
  lorelei,
};

export default defineEventHandler((event) => {
  // Get parameters from the URL (e.g., /api/avatar?seed=my-seed&style=adventurer).
  const query = getQuery(event);
  
  const seed = query.seed?.toString() || 'default-seed';
  const styleName = query.style?.toString() || 'adventurer';

  // Select the style from our map, defaulting to 'adventurer'.
  const selectedStyle = styles[styleName as keyof typeof styles] || styles.adventurer;
  
  // Create the avatar.
  const avatarSvg = createAvatar(selectedStyle, {
    seed: seed,
  }).toString();

  // Set the correct header to indicate SVG image content.
  setHeader(event, 'Content-Type', 'image/svg+xml');
  
  // Send the SVG as the response.
  return avatarSvg;
});