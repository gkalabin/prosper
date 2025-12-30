import {ExternalAccountMapping, StarlingToken} from '@prisma/client';
import {fetchTransactions} from './transactions';

// Mock global fetch
global.fetch = jest.fn();

describe('fetchTransactions', () => {
  const mockToken: StarlingToken = {
    id: '1',
    bankId: 1,
    access: 'mock-access-token',
    refresh: 'mock-refresh-token',
    accessValidUntil: new Date(),
    refreshValidUntil: new Date(),
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMapping: ExternalAccountMapping = {
    internalAccountId: 123,
    externalAccountId: 'account-uid:category-uid',
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should fetch and decode transactions, filtering out declined ones', async () => {
    const mockResponse = {
      feedItems: [
        {
          feedItemUid: 'tx-1',
          transactionTime: '2023-01-01T10:00:00Z',
          counterPartyName: 'Valid Transaction',
          amount: {minorUnits: 1000},
          direction: 'OUT',
          status: 'SETTLED',
        },
        {
          feedItemUid: 'tx-2',
          transactionTime: '2023-01-02T10:00:00Z',
          counterPartyName: 'Declined Transaction',
          amount: {minorUnits: 500},
          direction: 'OUT',
          status: 'DECLINED',
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const transactions = await fetchTransactions(mockToken, mockMapping);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].externalTransactionId).toBe('tx-1');
    expect(transactions[0].description).toBe('Valid Transaction');
  });

  it('should handle empty feed items', async () => {
    const mockResponse = {
      feedItems: [],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const transactions = await fetchTransactions(mockToken, mockMapping);

    expect(transactions).toHaveLength(0);
  });
});
