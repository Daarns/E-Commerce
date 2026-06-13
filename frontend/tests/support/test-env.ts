export interface TestCredentials {
  email: string;
  password: string;
}

const configuredApiUrl = process.env.TEST_API_URL ?? 'http://127.0.0.1:8080/api/v1';

export const TEST_API_URL = configuredApiUrl.endsWith('/')
  ? configuredApiUrl
  : `${configuredApiUrl}/`;
export const TEST_BACKEND_URL = process.env.TEST_BACKEND_URL ?? 'http://127.0.0.1:8080';
export const TEST_FRONTEND_URL = process.env.TEST_FRONTEND_URL ?? 'http://localhost:3000';

function readCredentials(emailKey: string, passwordKey: string): TestCredentials | undefined {
  const email = process.env[emailKey]?.trim();
  const password = process.env[passwordKey];

  return email && password ? { email, password } : undefined;
}

export const customerCredentials = readCredentials(
  'TEST_CUSTOMER_EMAIL',
  'TEST_CUSTOMER_PASSWORD'
);

export const secondCustomerCredentials = readCredentials(
  'TEST_SECOND_CUSTOMER_EMAIL',
  'TEST_SECOND_CUSTOMER_PASSWORD'
);

export const adminCredentials = readCredentials(
  'TEST_ADMIN_EMAIL',
  'TEST_ADMIN_PASSWORD'
);
