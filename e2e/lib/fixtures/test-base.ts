import {test as base} from '@playwright/test';
import {TestFactory} from './factory';

type TestFixtures = {
  seed: TestFactory;
};

export const test = base.extend<TestFixtures>({
  seed: async ({}, use) => {
    const factory = new TestFactory();
    await use(factory);
    await factory.cleanUp();
  },
});

export {expect} from '@playwright/test';
