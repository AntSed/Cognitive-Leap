// File: server/api/avatar.get.ts

import { defineEventHandler, getQuery, setHeader } from 'h3';
import { createAvatar } from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
import * as bottts from '@dicebear/bottts';
import * as micah from '@dicebear/micah';
import * as miniavs from '@dicebear/miniavs';
import * as pixelArt from '@dicebear/pixel-art';
import * as lorelei from '@dicebear/lorelei';

// Карта стилей, чтобы безопасно выбирать нужный
const styles = {
  adventurer,
  bottts,
  micah,
  miniavs,
  'pixel-art': pixelArt,
  lorelei,
};

export default defineEventHandler((event) => {
  // Получаем параметры из URL (например, /api/avatar?seed=my-seed&style=adventurer)
  const query = getQuery(event);
  
  const seed = query.seed?.toString() || 'default-seed';
  const styleName = query.style?.toString() || 'adventurer';

  // Выбираем стиль из нашей карты, по умолчанию adventurer
  const selectedStyle = styles[styleName as keyof typeof styles] || styles.adventurer;
  
  // Создаем аватар
  const avatarSvg = createAvatar(selectedStyle, {
    seed: seed,
  }).toString();

  // Устанавливаем правильный заголовок, чтобы браузер понял, что это изображение
  setHeader(event, 'Content-Type', 'image/svg+xml');
  
  // Отправляем SVG в качестве ответа
  return avatarSvg;
});