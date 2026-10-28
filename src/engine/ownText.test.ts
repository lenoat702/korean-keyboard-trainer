import { describe, expect, it } from 'vitest';
import { toKeystrokes } from '../hangul/text';
import { cleanText, splitParts } from './ownText';

describe('cleanText', () => {
  it('keeps Hangul, numbers and . , ? ! and drops what the trainer cannot check', () => {
    expect(cleanText('“안녕하세요,” 그가 말했다 (hello) 😊')).toEqual({ text: '안녕하세요, 그가 말했다', removed: 10 });
  });

  it('turns line breaks into spaces and tidies spacing before punctuation', () => {
    expect(cleanText('첫 줄\n\n둘째 줄 .').text).toBe('첫 줄 둘째 줄.');
  });

  it('recomposes decomposed Hangul, as pasted from some Mac apps', () => {
    expect(cleanText('한국'.normalize('NFD')).text).toBe('한국');
  });

  it('maps full-width punctuation to the keyboard kind', () => {
    expect(cleanText('네？ 좋아요！').text).toBe('네? 좋아요!');
  });

  it('drops punctuation left at the start once letters are removed', () => {
    expect(cleanText('Hello! 안녕?')).toEqual({ text: '안녕?', removed: 6 });
  });

  it('leaves nothing when there is no Korean to keep', () => {
    expect(cleanText('just English').text).toBe('');
  });
});

describe('splitParts', () => {
  const sentence = '저는 매일 아침 일찍 일어나서 공원에서 천천히 걸어요.';

  it('keeps every word, in order', () => {
    const text = Array(12).fill(sentence).join(' ');
    expect(splitParts(text).join(' ')).toBe(text);
  });

  it('ends parts at sentence ends once they are long enough', () => {
    const parts = splitParts(Array(12).fill(sentence).join(' '));
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(part).toMatch(/\.$/);
    for (const part of parts.slice(0, -1)) expect(toKeystrokes(part).length).toBeGreaterThanOrEqual(110);
  });

  it('still splits long text with no sentence ends, at spaces', () => {
    const parts = splitParts(Array(60).fill('사과').join(' '));
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(part.split(' ').every((w) => w === '사과')).toBe(true);
  });
});
