import React, { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../app/page';

vi.mock('../App', () => ({
  __esModule: true,
  default: () => <div data-testid="app-root">App Loaded</div>,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default:
    (importer: () => Promise<{ default: React.ComponentType }>, options?: { loading?: () => React.ReactNode }) =>
    () => {
      const LazyComponent = React.lazy(importer);
      return (
        <Suspense fallback={options?.loading?.() ?? null}>
          <LazyComponent />
        </Suspense>
      );
    },
}));

describe('HomePage', () => {
  it('renders the client app with a loading state', async () => {
    render(<HomePage />);

    expect(screen.getByTestId('app-loader')).toBeInTheDocument();
    expect(await screen.findByTestId('app-root')).toBeInTheDocument();
  });
});
