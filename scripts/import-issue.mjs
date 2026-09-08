import { readFile, writeFile, appendFile } from 'node:fs/promises';

const eventPath = process.env.GITHUB_EVENT_PATH || process.argv[2];
if (!eventPath) fail('Не найден GITHUB_EVENT_PATH.');

const event = JSON.parse(await readFile(eventPath, 'utf8'));
const issue = event.issue;
if (!issue || typeof issue.body !== 'string') fail('В событии нет текста Issue.');

const submitted = parseSubmittedJson(issue.body);
const item = normalizeSubmittedItem(submitted);
validateItem(item);

const databaseUrl = new URL('../data/segments.json', import.meta.url);
const database = JSON.parse(await readFile(databaseUrl, 'utf8'));
if (!database || database.schemaVersion !== 1 || !Array.isArray(database.segments)) {
  fail('Текущий data/segments.json имеет неверный формат.');
}

const sameId = database.segments.findIndex(entry => entry.id === item.id);
const sameSlot = database.segments.findIndex(entry =>
  Number(entry.animeId) === item.animeId
  && Number(entry.episode) === item.episode
  && String(entry.translation) === item.translation
  && String(entry.category) === item.category
);
const replaceIndex = sameId >= 0 ? sameId : sameSlot;
let action = 'added';

if (replaceIndex >= 0) {
  database.segments[replaceIndex] = item;
  action = 'updated';
} else {
  database.segments.push(item);
}

database.segments.sort((left, right) =>
  Number(left.animeId) - Number(right.animeId)
  || Number(left.episode) - Number(right.episode)
  || String(left.translation).localeCompare(String(right.translation), 'ru')
  || String(left.category).localeCompare(String(right.category), 'en')
);
database.updatedAt = new Date().toISOString();

await writeFile(databaseUrl, JSON.stringify(database, null, 2) + '\n', 'utf8');

if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, 'action=' + action + '\n', 'utf8');
  await appendFile(process.env.GITHUB_OUTPUT, 'segment_id=' + item.id + '\n', 'utf8');
}

console.log((action === 'added' ? 'Добавлена' : 'Обновлена') + ' метка ' + item.id);

function parseSubmittedJson(body) {
  const fenced = body.match(/(?:~~~|\x60{3})\s*json\s*\r?\n([\s\S]*?)(?:~~~|\x60{3})/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (error) {
      fail('JSON в блоке Issue повреждён: ' + error.message);
    }
  }

  const firstBrace = body.indexOf('{');
  const lastBrace = body.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(body.slice(firstBrace, lastBrace + 1));
    } catch (error) {
      fail('Не удалось прочитать JSON из Issue: ' + error.message);
    }
  }
  fail('В Issue не найден JSON-объект.');
}

function normalizeSubmittedItem(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('Предложение должно содержать один JSON-объект.');
  }
  return {
    id: String(value.id || '').trim(),
    animeId: Number(value.animeId),
    animeSlug: String(value.animeSlug || '').trim(),
    episode: Number(value.episode),
    translation: String(value.translation || '*').trim() || '*',
    category: String(value.category || ''),
    segment: Array.isArray(value.segment) ? value.segment.map(round) : [],
    ...(String(value.submittedBy || '').trim()
      ? { submittedBy: String(value.submittedBy).trim() }
      : {}),
    status: 'approved'
  };
}

function validateItem(item) {
  if (item.id.length < 8 || item.id.length > 100) {
    fail('id должен содержать от 8 до 100 символов.');
  }
  if (!Number.isInteger(item.animeId) || item.animeId < 1) {
    fail('animeId должен быть положительным целым числом.');
  }
  if (!item.animeSlug || item.animeSlug.length > 240 || !item.animeSlug.endsWith('-' + item.animeId)) {
    fail('animeSlug должен заканчиваться на AnimeOn ID.');
  }
  if (!Number.isInteger(item.episode) || item.episode < 1) {
    fail('episode должен быть номером серии от 1.');
  }
  if (!item.translation || item.translation.length > 120) {
    fail('translation отсутствует или слишком длинное.');
  }
  if (item.category !== 'opening' && item.category !== 'ending') {
    fail('category должна быть opening или ending.');
  }
  if (item.segment.length !== 2 || !item.segment.every(Number.isFinite)) {
    fail('segment должен содержать два числа.');
  }
  if (item.segment[0] < 0 || item.segment[1] <= item.segment[0] || item.segment[1] > 28800) {
    fail('Указан неверный диапазон времени.');
  }
  if (item.submittedBy && !/^aocs-[0-9a-f-]{36}$/i.test(item.submittedBy)) {
    fail('submittedBy должен содержать анонимный AOCS ID.');
  }
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
