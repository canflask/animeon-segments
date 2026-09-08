import { readFile } from 'node:fs/promises';

const fileUrl = new URL('../data/segments.json', import.meta.url);
const raw = await readFile(fileUrl, 'utf8');
let database;

try {
  database = JSON.parse(raw);
} catch (error) {
  fail('data/segments.json содержит ошибку JSON: ' + error.message);
}

if (!database || typeof database !== 'object' || Array.isArray(database)) {
  fail('Корень базы должен быть объектом.');
}
if (database.schemaVersion !== 1) {
  fail('schemaVersion должен быть равен 1.');
}
if (!Number.isFinite(Date.parse(database.updatedAt))) {
  fail('updatedAt должен содержать дату ISO 8601.');
}
if (!Array.isArray(database.segments)) {
  fail('segments должен быть массивом.');
}

const ids = new Set();
const slots = new Set();
const errors = [];

database.segments.forEach((item, index) => {
  const path = 'segments[' + index + ']';
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push(path + ': запись должна быть объектом.');
    return;
  }

  const allowed = new Set([
    'id',
    'animeId',
    'animeSlug',
    'episode',
    'translation',
    'category',
    'segment',
    'status'
  ]);
  for (const key of Object.keys(item)) {
    if (!allowed.has(key)) errors.push(path + ': неизвестное поле ' + key + '.');
  }

  if (typeof item.id !== 'string' || item.id.trim().length < 8 || item.id.length > 100) {
    errors.push(path + '.id: строка длиной от 8 до 100 символов.');
  } else if (ids.has(item.id)) {
    errors.push(path + '.id: повторяющийся ID ' + item.id + '.');
  } else {
    ids.add(item.id);
  }

  if (!Number.isInteger(item.animeId) || item.animeId < 1) {
    errors.push(path + '.animeId: требуется положительное целое число.');
  }
  if (typeof item.animeSlug !== 'string' || !item.animeSlug.trim() || item.animeSlug.length > 240) {
    errors.push(path + '.animeSlug: требуется slug страницы AnimeOn.');
  }
  if (!Number.isInteger(item.episode) || item.episode < 1) {
    errors.push(path + '.episode: требуется номер серии от 1.');
  }
  if (typeof item.translation !== 'string' || !item.translation.trim() || item.translation.length > 120) {
    errors.push(path + '.translation: используйте * или название озвучки.');
  }
  if (item.category !== 'opening' && item.category !== 'ending') {
    errors.push(path + '.category: допустимы opening и ending.');
  }
  if (!Array.isArray(item.segment) || item.segment.length !== 2) {
    errors.push(path + '.segment: требуется массив [начало, конец].');
  } else {
    const start = item.segment[0];
    const end = item.segment[1];
    if (!Number.isFinite(start) || start < 0 || start > 28800) {
      errors.push(path + '.segment[0]: неверное время начала.');
    }
    if (!Number.isFinite(end) || end <= 0 || end > 28800) {
      errors.push(path + '.segment[1]: неверное время конца.');
    }
    if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
      errors.push(path + '.segment: конец должен быть позже начала.');
    }
  }
  if (item.status !== 'approved') {
    errors.push(path + '.status: в основной базе допустим только approved.');
  }

  const slot = [item.animeId, item.episode, item.translation, item.category].join('|');
  if (slots.has(slot)) {
    errors.push(path + ': для этой серии, озвучки и категории уже есть метка.');
  } else {
    slots.add(slot);
  }
});

if (errors.length) {
  console.error('Проверка не пройдена:\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log('OK: проверено меток — ' + database.segments.length);

function fail(message) {
  console.error(message);
  process.exit(1);
}
