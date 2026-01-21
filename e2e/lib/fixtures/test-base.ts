import {test as base} from '@playwright/test';
import {LoginPage} from '../../pages/LoginPage';
import {TestFactory} from './factory';

type LoginAsFn = (user: {login: string; rawPassword: string}) => Promise<void>;

type TestFixtures = {
  seed: TestFactory;
  loginAs: LoginAsFn;
};

export const test = base.extend<TestFixtures>({
  seed: async ({}, use) => {
    const factory = new TestFactory();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(factory);
    await factory.cleanUp();
  },

  loginAs: async ({page}, use) => {
    const performLogin: LoginAsFn = async user => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(performLogin);
  },
});

export {expect} from '@playwright/test';
