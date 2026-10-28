import { describe, expect, it } from 'vitest';
import { glossText, sentenceAt } from './meanings';

describe('glossText', () => {
  it('finds each known word, with its place in the text', () => {
    expect(glossText('아이 나라 낰')).toEqual([
      { start: 0, end: 2, meaning: 'child', kind: 'word' },
      { start: 3, end: 5, meaning: 'country', kind: 'word' },
    ]);
  });

  it('matches whole sentences, not the words inside them', () => {
    const text = '저는 학생이에요. 이거 얼마예요?';
    const glosses = glossText(text);
    expect(glosses.map((g) => [g.kind, text.slice(g.start, g.end)])).toEqual([
      ['sentence', '저는 학생이에요.'],
      ['sentence', '이거 얼마예요?'],
    ]);
  });

  it('prefers a whole paragraph over a shorter sentence inside it', () => {
    const text = '내일은 엄마 생신이에요. 케이크를 사고, 편지도 썼어요. 엄마가 좋아하시면 좋겠어요!';
    const glosses = glossText(text);
    expect(glosses).toHaveLength(1);
    expect(glosses[0]).toMatchObject({ start: 0, end: text.length, kind: 'sentence' });
  });

  it('has nothing for text it does not know', () => {
    expect(glossText('회의는 취소됐습니다.')).toEqual([]);
  });
});

describe('sentenceAt', () => {
  it('gives the sentence you are in, or the next one from the space between', () => {
    const text = '맛있어요! 조심하세요!';
    const glosses = glossText(text);
    expect(sentenceAt(glosses, 0)?.meaning).toBe("It's delicious!");
    expect(sentenceAt(glosses, 5)?.meaning).toBe('Be careful!');
    expect(sentenceAt(glosses, text.length)).toBeUndefined();
  });
});
