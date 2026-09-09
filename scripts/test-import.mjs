import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), 'animeon-segments-test-'));

try {
  await mkdir(join(root, 'scripts'));
  await mkdir(join(root, 'data'));
  await copyFile(new URL('./import-issue.mjs', import.meta.url), join(root, 'scripts', 'import-issue.mjs'));
  await writeFile(join(root, 'data', 'segments.json'), JSON.stringify({
    schemaVersion: 1,
    updatedAt: '2026-09-09T00:00:00.000Z',
    segments: []
  }), 'utf8');

  const segments = ['opening', 'ending'].map((category, index) => ({
    id: 'test-segment-' + category,
    animeId: 37521,
    animeSlug: 'saga-o-vinlande-37521',
    episode: 1,
    translation: '*',
    category,
    segment: index === 0 ? [75, 165] : [1320, 1410],
    submittedBy: 'canflask',
    status: 'approved'
  }));
  const eventPath = join(root, 'event.json');
  await writeFile(eventPath, JSON.stringify({ issue: { body: '~~~json\n' + JSON.stringify(segments) + '\n~~~' } }), 'utf8');

  await execFileAsync(process.execPath, [join(root, 'scripts', 'import-issue.mjs'), eventPath]);
  const database = JSON.parse(await readFile(join(root, 'data', 'segments.json'), 'utf8'));
  assert.equal(database.segments.length, 2);
  assert.deepEqual(database.segments.map(item => item.category).sort(), ['ending', 'opening']);
  assert.ok(database.segments.every(item => item.submittedBy === 'canflask'));
  console.log('OK: единый блок OP + ED импортирован');
} finally {
  await rm(root, { recursive: true, force: true });
}
