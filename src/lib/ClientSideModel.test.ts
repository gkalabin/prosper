import {ExchangeRates} from '@/lib/ClientSideModel';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {mustFindByCode} from '@/lib/model/Currency';
import {ExchangeRate as PbExchangeRate} from '@/lib/grpc/gen/prosper/v1/rates';

function rate(
  from: string,
  to: string,
  isoUtc: string,
  rateNanos: number
): PbExchangeRate {
  const ms = Date.parse(isoUtc);
  return {
    currencyCodeFrom: from,
    currencyCodeTo: to,
    rateTimestamp: {
      seconds: BigInt(Math.floor(ms / 1000)),
      nanos: (ms % 1000) * 1_000_000,
    },
    rateNanos: BigInt(rateNanos),
  } as PbExchangeRate;
}

describe('ExchangeRates day bucketing', () => {
  test('two rates on adjacent UTC days bucket separately', () => {
    const rates = new ExchangeRates([
      rate('RUB', 'GBP', '2025-06-06T20:47:38Z', 9380000),
      rate('RUB', 'GBP', '2025-06-05T23:00:00Z', 9531000),
    ]);
    const rub = mustFindByCode('RUB');
    const gbp = mustFindByCode('GBP');
    const a = new AmountWithCurrency({
      amountCents: 10_000_00,
      currency: rub,
    });

    const jun5 = rates.exchange(a, gbp, Date.parse('2025-06-05T12:00:00Z'));
    expect(jun5!.cents()).toBe(9531);
    const jun6 = rates.exchange(a, gbp, Date.parse('2025-06-06T12:00:00Z'));
    expect(jun6!.cents()).toBe(9380);
  });
});
