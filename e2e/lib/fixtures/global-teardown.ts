import {TestFactory} from './factory';

async function globalTeardown() {
  await TestFactory.globalCleanUp();
}

export default globalTeardown;
