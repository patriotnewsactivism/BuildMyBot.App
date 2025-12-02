# Testing Guide

This document describes the testing strategy and how to run tests for BuildMyBot.app.

## Table of Contents

1. [Overview](#overview)
2. [Running Tests](#running-tests)
3. [Unit Tests](#unit-tests)
4. [Integration Tests](#integration-tests)
5. [End-to-End Tests](#end-to-end-tests)
6. [Coverage Reports](#coverage-reports)
7. [Writing Tests](#writing-tests)

---

## Overview

BuildMyBot uses a comprehensive testing strategy:

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test Edge Functions and database operations
- **End-to-End Tests**: Test complete user workflows

### Test Stack

- **Vitest**: Fast unit test framework
- **React Testing Library**: Component testing
- **Deno**: Edge Function testing
- **Mock Service Worker**: API mocking

---

## Running Tests

### Unit Tests

Run all unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm test -- --watch
```

Run tests with UI:

```bash
npm run test:ui
```

Run tests with coverage:

```bash
npm run test:coverage
```

### Integration Tests

Integration tests require a running Supabase instance:

```bash
# Start local Supabase
supabase start

# Run integration tests
deno test --allow-all test/edge-functions/
```

---

## Unit Tests

### Service Tests

Located in `test/`:

- `authService.test.ts` - Authentication service tests
- `dbService.test.ts` - Database service tests
- `loggingService.test.ts` - Logging service tests
- `sentryService.test.ts` - Error tracking tests

### Example Unit Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { authService } from '../services/authService';

describe('authService', () => {
  it('should sign up a new user', async () => {
    const result = await authService.signUp(
      'test@example.com',
      'password123'
    );

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
  });
});
```

---

## Integration Tests

### Edge Function Tests

Located in `test/edge-functions/`:

- `create-lead.test.ts` - Lead creation tests
- `ai-complete.test.ts` - AI completion tests
- `billing-overage-check.test.ts` - Billing tests

### Example Integration Test

```typescript
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("create-lead: should create new lead", async () => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-lead`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        botId: 'bot-123',
        email: 'test@example.com'
      })
    }
  );

  assertEquals(response.status, 200);
  const result = await response.json();
  assertEquals(result.success, true);
});
```

---

## End-to-End Tests

### Setup

E2E tests use Playwright (to be implemented):

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test';

test('user can create a bot', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Login
  await page.click('text=Sign In');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button:has-text("Sign In")');

  // Create bot
  await page.click('text=New Bot');
  await page.fill('input[name="name"]', 'Test Bot');
  await page.click('button:has-text("Save")');

  // Verify
  await expect(page.locator('text=Test Bot')).toBeVisible();
});
```

---

## Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

### Coverage Requirements

- **Overall**: 80% minimum
- **Services**: 90% minimum
- **Components**: 70% minimum
- **Utilities**: 95% minimum

### View Coverage Report

After running coverage, open:

```
coverage/index.html
```

---

## Writing Tests

### Best Practices

1. **Test Behavior, Not Implementation**
   ```typescript
   // Good
   it('should display error message when login fails', async () => {
     // Test the user-visible behavior
   });

   // Bad
   it('should call setError with message', async () => {
     // Tests internal implementation
   });
   ```

2. **Use Descriptive Test Names**
   ```typescript
   // Good
   it('should create lead when valid email provided', async () => {});

   // Bad
   it('test lead creation', async () => {});
   ```

3. **Arrange, Act, Assert**
   ```typescript
   it('should update user profile', async () => {
     // Arrange
     const user = { id: '123', name: 'John' };

     // Act
     await dbService.saveUserProfile(user);

     // Assert
     const saved = await dbService.getUserProfile('123');
     expect(saved.name).toBe('John');
   });
   ```

4. **Mock External Dependencies**
   ```typescript
   vi.mock('../services/supabaseClient', () => ({
     supabase: {
       auth: {
         signIn: vi.fn()
       }
     }
   }));
   ```

5. **Clean Up After Tests**
   ```typescript
   afterEach(async () => {
     // Clean up test data
     await cleanup();
   });
   ```

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BotBuilder } from '../components/BotBuilder/BotBuilder';

describe('BotBuilder', () => {
  it('should save bot on submit', async () => {
    render(<BotBuilder />);

    // Fill form
    fireEvent.change(screen.getByLabelText('Bot Name'), {
      target: { value: 'Test Bot' }
    });

    // Submit
    fireEvent.click(screen.getByText('Save Bot'));

    // Verify
    expect(await screen.findByText('Bot saved!')).toBeInTheDocument();
  });
});
```

### Async Testing

```typescript
it('should load user data', async () => {
  const promise = loadUserData();

  // Show loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  // Wait for data
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

---

## Continuous Integration

### GitHub Actions

Tests run automatically on push and PR:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run build
```

---

## Test Data

### Fixtures

Create reusable test data:

```typescript
// test/fixtures/bots.ts
export const mockBot = {
  id: 'bot-123',
  name: 'Test Bot',
  type: 'support',
  systemPrompt: 'You are helpful',
  model: 'gpt-4',
  temperature: 0.7,
  active: true
};
```

### Factories

Generate test data dynamically:

```typescript
// test/factories/user.ts
export const createUser = (overrides = {}) => ({
  id: `user-${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  name: 'Test User',
  plan: 'free',
  ...overrides
});
```

---

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "should create lead"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

### View Test Output

```bash
npm test -- --reporter=verbose
```

---

## Performance Testing

### Load Testing

Use k6 for API load tests:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.post('YOUR_API_URL/create-lead', JSON.stringify({
    botId: 'bot-123',
    email: 'test@example.com'
  }));

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
}
```

---

## Troubleshooting

### Common Issues

**Tests timing out:**
- Increase timeout: `it('test', async () => {}, 10000)`
- Check for unresolved promises
- Verify mock responses

**Flaky tests:**
- Add proper waitFor conditions
- Avoid time-dependent assertions
- Use deterministic test data

**Mock not working:**
- Ensure mock is defined before import
- Check mock path is correct
- Verify vi.mock syntax

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Deno Testing](https://deno.land/manual/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: January 2024
