import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_SNAPSHOT_BYTES,
  MemoryStore,
  createSession,
  handleClassroomRequest,
  joinStudent,
  putSnapshot,
  sanitizeSnapshot,
} from '../classroom/classroom-core.mjs';
import classroomWorker from '../classroom/worker.js';

test('snapshot contract preserves review state and puzzle shape', () => {
  const snapshot = sanitizeSnapshot({
    phase: 'review',
    revision: 42,
    config: {
      modeId: 'kata-hira',
      chartId: 'seion',
      puzzleId: './puzzles/demo.webp',
      sizeId: '8x4',
      shape: 'rect',
      seed: 123,
    },
    placed: ['a-1'],
    review: {
      keys: ['a-1', 'a-2'],
      counts: {'a-1': 2},
      matched: ['a-2'],
      leftId: 'a-1',
      rightId: null,
      choicePick: 'wrong-option',
      wrong: true,
    },
  });

  assert.equal(snapshot.phase, 'review');
  assert.equal(snapshot.config.shape, 'rect');
  assert.equal(snapshot.revision, 42);
  assert.deepEqual(snapshot.review.keys, ['a-1', 'a-2']);
  assert.deepEqual(snapshot.review.matched, ['a-2']);
  assert.equal(snapshot.review.counts['a-1'], 2);
  assert.equal(snapshot.review.leftId, 'a-1');
  assert.equal(snapshot.review.choicePick, 'wrong-option');
  assert.equal(snapshot.review.wrong, true);
});

test('replacement student starts with a clean snapshot', () => {
  const now = 1_000_000;
  const session = createSession(now, {code: 'ABCD'});
  const first = joinStudent(session, now);
  session.snapshot = {phase: 'play'};
  session.snapshotRevision = 9;

  const replacement = joinStudent(session, now + 45_001);
  assert.ok(first.studentToken);
  assert.ok(replacement.studentToken);
  assert.notEqual(replacement.studentToken, first.studentToken);
  assert.equal(session.snapshot, null);
  assert.equal(session.snapshotRevision, -1);
});

test('ended rooms reject student snapshot writes', () => {
  const now = 2_000_000;
  const session = createSession(now, {code: 'ABCD'});
  const {studentToken} = joinStudent(session, now);
  session.ended = true;

  const result = putSnapshot(session, studentToken, {
    phase: 'play',
    revision: 1,
    config: {shape: 'jigsaw'},
  }, now + 1);

  assert.equal(result.status, 409);
  assert.equal(result.error, 'ended');
  assert.equal(session.snapshot, null);
});

test('stale snapshot revisions cannot overwrite newer state', () => {
  const now = 3_000_000;
  const session = createSession(now, {code: 'ABCD'});
  const {studentToken} = joinStudent(session, now);

  assert.equal(putSnapshot(session, studentToken, {
    phase: 'play',
    revision: 10,
    placed: ['new'],
    config: {shape: 'jigsaw'},
  }, now + 1).revision, 10);

  const stale = putSnapshot(session, studentToken, {
    phase: 'play',
    revision: 9,
    placed: ['old'],
    config: {shape: 'jigsaw'},
  }, now + 2);

  assert.equal(stale.status, 409);
  assert.equal(stale.error, 'stale_snapshot');
  assert.equal(stale.revision, 10);
  assert.deepEqual(session.snapshot.placed, ['new']);
});

test('expired room code can be reclaimed only through the internal explicit-create path', async () => {
  const store = new MemoryStore();
  await store.create(createSession(0, {code: 'ABCD'}));

  const request = new Request('https://example.test/rooms/ABCD', {method: 'POST'});
  const response = await handleClassroomRequest(
    request,
    store,
    4 * 60 * 60 * 1000,
    {allowExplicitCreate: true}
  );
  assert.equal(response.status, 201);
});

test('classroom core rejects public explicit room creation by default', async () => {
  const store = new MemoryStore();
  const response = await handleClassroomRequest(
    new Request('https://example.test/rooms/ABCD', {method: 'POST'}),
    store,
    5_000_000
  );
  assert.equal(response.status, 404);
});

test('room expires exactly at the configured TTL boundary', () => {
  const session = createSession(10_000, {code: 'ABCD'});
  assert.equal(
    putSnapshot(session, 'wrong-token', {phase: 'play'}, 10_000 + 4 * 60 * 60 * 1000).error,
    'not_found'
  );
});

test('snapshot body limit counts UTF-8 bytes', async () => {
  const now = 4_000_000;
  const store = new MemoryStore();
  const session = createSession(now, {code: 'ABCD'});
  const {studentToken} = joinStudent(session, now);
  await store.create(session);

  const body = JSON.stringify({
    phase: 'play',
    revision: 1,
    config: {shape: 'jigsaw'},
    padding: '界'.repeat(Math.ceil(MAX_SNAPSHOT_BYTES / 3) + 100),
  });

  const response = await handleClassroomRequest(new Request(
    'https://example.test/rooms/ABCD/snapshot',
    {
      method: 'PUT',
      headers: {Authorization: `Bearer ${studentToken}`},
      body,
    }
  ), store, now + 1);

  assert.equal(response.status, 413);
});

test('public callers cannot create a chosen room code directly', async () => {
  const response = await classroomWorker.fetch(
    new Request('https://example.test/rooms/ABCD', {method: 'POST'}),
    {ROOMS: {get() { throw new Error('should not reach Durable Object'); }}}
  );
  assert.equal(response.status, 404);
});
