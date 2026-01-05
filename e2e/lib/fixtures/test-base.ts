import {test as base} from '@playwright/test';
import {TestFactory} from './factory';

type TestFixtures = {
  seed: TestFactory;
};

export const test = base.extend<TestFixtures>({
  seed: async ({}, use) => {
    const factory = new TestFactory();
    // This is not a React hook, but a test fixture, do not fail eslint.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(factory);
    await factory.cleanUp();
  },
});

export {expect} from '@playwright/test';
