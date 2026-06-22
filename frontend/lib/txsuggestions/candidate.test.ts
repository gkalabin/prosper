import {StringCandidate} from '@/lib/grpc/gen/prosper/v1/ledger';
import {winnerString} from '@/lib/txsuggestions/candidate';
import {expect, test} from '@jest/globals';

function candidate(value: string, confidence: number): StringCandidate {
  return {value, confidence};
}

describe('winnerString', () => {
  test('returns undefined for an empty field', () => {
    expect(winnerString([])).toBeUndefined();
  });

  test('picks the most confident candidate', () => {
    const field = [candidate('ZETTLE *STARBU', 50), candidate('Starbucks', 80)];
    expect(winnerString(field)).toBe('Starbucks');
  });

  test('keeps the first proposer when confidence ties', () => {
    const field = [candidate('First', 100), candidate('Second', 100)];
    expect(winnerString(field)).toBe('First');
  });
});
