import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleCliError(error) {
  if (error instanceof ZodError) {
    console.error(formatZodError(error));
  } else if (error instanceof AppError) {
    console.error(error.message);
  } else if (error?.code === '23505') {
    console.error('Duplicate record. Check unique fields and try again.');
  } else if (error?.code === '23503') {
    console.error('Referenced record was not found. Check the provided id values.');
  } else if (error?.message) {
    console.error(error.message);
  } else {
    console.error('Command failed.');
  }

  process.exitCode = 1;
}

function formatZodError(error) {
  const issues = error.issues.map((issue) => {
    const field = issue.path.join('.') || 'input';
    return `${field}: ${issue.message}`;
  });

  return `Invalid input:\n${issues.join('\n')}`;
}
