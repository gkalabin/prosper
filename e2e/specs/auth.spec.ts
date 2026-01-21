import {v4 as uuidv4} from 'uuid';
import {expect, test} from '../lib/fixtures/test-base';
import {LoginPage} from '../pages/LoginPage';
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

  test.describe('Login', () => {
    test('allows existing user to login', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const loginPage = new LoginPage(page);
      // When
      await loginPage.goto();
      await loginPage.login(user.login, user.rawPassword);
      // Then
      await expect(page).toHaveURL('/overview');
    });

    test('shows error for invalid credentials', async ({page, seed}) => {
      // Given
      const user = await seed.createUser();
      const loginPage = new LoginPage(page);
      // When
      await loginPage.goto();
      await loginPage.attemptLogin(user.login, 'wrongpassword');
      // Then
      await loginPage.expectLoginError('Wrong login or password');
      await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('redirects unauthenticated user to login page', async ({page}) => {
      // When
      await page.goto('/overview');
      // Then
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });

  test.describe('Logout', () => {
    test('logs out user and redirects to login page', async ({
      page,
      seed,
      loginAs,
    }) => {
      // Given
      const user = await seed.createUser();
      await loginAs(user);
      await page.goto('/overview');
      await expect(page).toHaveURL('/overview');
      // When
      await page.getByRole('button', {name: 'Open user menu'}).click();
      await page.getByRole('menuitem', {name: 'Sign Out'}).click();
      // Then
      await expect(page).toHaveURL(/\/auth\/signin/);
      await page.goto('/overview');
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });
});
