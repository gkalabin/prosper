// Constants shared by the e2e fixtures.

// TEST_USER_PASSWORD is the default password used for fixture users
// when the test does not override it.
export const TEST_USER_PASSWORD = 'password123';

// DEFAULT_TEST_CURRENCY is the currency code stamped onto fixture
// users' DisplaySettings and bank accounts unless overridden.
export const DEFAULT_TEST_CURRENCY = 'USD';

// NANOS_PER_DOLLAR is the multiplier between a whole-unit currency
// (or stock share) and its nano representation. Used everywhere the
// fixtures compose amount columns.
export const NANOS_PER_DOLLAR = 1_000_000_000;
