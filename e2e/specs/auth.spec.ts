import {v4 as uuidv4} from 'uuid';
import {test} from '../lib/fixtures/test-base';
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
      // Then: registration successful, overview opens
      const overview = new OverviewPage(page);
      overview.goto();
      await overview.expectBalance('$0');
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

  test.describe('Login', () => {
    test('allows existing user to log in', async () => {
      // TODO: Create user via seed
      // TODO: Navigate to login page
      // TODO: Enter valid credentials
      // TODO: Submit form
      // TODO: Verify redirect to overview page
    });

    test('shows error for invalid credentials', async () => {
      // TODO: Navigate to login page
      // TODO: Enter non-existent username or wrong password
      // TODO: Submit form
      // TODO: Verify error message is displayed
    });

    test('redirects unauthenticated users to login page', async () => {
      // TODO: Attempt to navigate to a protected route (e.g., /overview)
      // TODO: Verify redirect to login page
    });
  });

  test.describe('Logout', () => {
    test('allows logged-in user to log out', async () => {
      // TODO: Create user and log in via seed
      // TODO: Click logout button/link
      // TODO: Verify redirect to login page
      // TODO: Verify session is invalidated (cannot access protected routes)
    });
  });
});
