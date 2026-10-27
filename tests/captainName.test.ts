import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  captainInitial,
  normalizeCaptainName,
} from '../src/domain/captainName';

void test('captain names use the same Unicode length limits as the database', () => {
  assert.throws(() => normalizeCaptainName('🚀🚀'));
  assert.equal(normalizeCaptainName('🚀'.repeat(15)), '🚀'.repeat(15));
  assert.equal(normalizeCaptainName('Ж'.repeat(24)), 'Ж'.repeat(24));
  assert.throws(() => normalizeCaptainName('🚀'.repeat(25)));
});

void test('names are trimmed and control characters are rejected', () => {
  assert.equal(normalizeCaptainName('  Капітан  '), 'Капітан');
  for (const name of ['', '  ', 'ab', 'captain\nname', 'captain\u0000name'])
    assert.throws(() => normalizeCaptainName(name));
});

void test('avatars keep the first complete grapheme, including combined emoji', () => {
  for (const initial of ['🚀', '👩‍🚀', '🇺🇦', 'A\u0301'])
    assert.equal(captainInitial(`${initial} Captain`), initial);
  assert.equal(captainInitial('abyss'), 'A');
  assert.equal(captainInitial(''), '?');
});
