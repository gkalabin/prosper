import {v4 as uuidv4} from 'uuid';
import {expect, test} from '../lib/fixtures/test-base';
import {OverviewPage} from '../pages/OverviewPage';
import {RegisterPage} from '../pages/RegisterPage';

test.describe('Authentication', () => {
  test.describe('Registration', () => {
    test('allows new user to register with valid credentials', async ({
      page,
      seed,
    }) => {
      // Given
      const login = 'e2e_test_user_' + uuidv4().slice(0, 8);
      seed.registerUserForCleanup(login);
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      // When: user sign up
      await registerPage.register(login, 'password123');
      await registerPage.expectSuccess();
      // Then: registration successful, overview opens
      const overview = new OverviewPage(page);
      await overview.goto();
      // User needs to create at least one bank account first, so overview shows an empty state.
      // Do not assume the page content as it's fragile, but check that there is no redirect away from the overview page.
      await expect(page).toHaveURL('/overview');
    });

    test('shows error for duplicate username', async ({page, seed}) => {
      // Given: an existing user
      const user = await seed.createUser();
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      // When: registering with the same username
      await registerPage.register(user.login, 'password123');
      // Then: error message is displayed
      await registerPage.expectUserAlreadyExistsError();
    });
  });
});
