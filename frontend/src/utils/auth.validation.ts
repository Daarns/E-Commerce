export const validateEmail = (email: string): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = 'Please enter a valid email';
  }
  return errors;
};

export const validateLoginForm = (email: string, password: string): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return errors;
};

export const validateRegisterForm = (
  name: string,
  email: string,
  password: string
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!name || name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  return errors;
};

