import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PhoneAgent } from './PhoneAgent';
import { PlanType, UserRole } from '../../types';

const simulateInboundCall = vi.fn();
const subscribeToUserPhoneCalls = vi.fn();

vi.mock('../../services/phoneCallService', () => ({
  phoneCallService: {
    subscribeToUserPhoneCalls: (...args: unknown[]) => subscribeToUserPhoneCalls(...args),
    simulateInboundCall: (...args: unknown[]) => simulateInboundCall(...args),
  },
}));

const baseUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'user@example.com',
  role: UserRole.OWNER,
  plan: PlanType.FREE,
  companyName: 'Acme',
  phoneConfig: {
    enabled: true,
    phoneNumber: 'PN123',
    voiceId: 'alloy',
    introMessage: 'Hello there',
  },
};

describe('PhoneAgent', () => {
  beforeEach(() => {
    subscribeToUserPhoneCalls.mockClear();
    simulateInboundCall.mockClear();
    subscribeToUserPhoneCalls.mockReturnValue(() => {});
    simulateInboundCall.mockResolvedValue({
      data: {
        id: 'call-1',
        userId: 'user-1',
        status: 'completed',
        metadata: {},
      },
    });

    Object.assign(global, {
      navigator: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
    });

    (window as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      paused: false,
      pending: false,
      speaking: false,
      getVoices: () => [],
      onvoiceschanged: null,
    } as unknown as SpeechSynthesis;
  });

  it('logs a simulated call from the UI', async () => {
    render(<PhoneAgent user={baseUser} />);

    const transcript = screen.getByPlaceholderText('What should the AI capture from this call?');
    await act(async () => {
      await userEvent.clear(transcript);
      await userEvent.type(transcript, 'Please note this down');
    });

    const simulateButton = screen.getByTestId('simulate-call');
    await act(async () => {
      await userEvent.click(simulateButton);
    });

    expect(simulateInboundCall).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        toNumber: 'PN123',
      }),
    );

    expect(await screen.findByText('Simulated call logged')).toBeInTheDocument();
  });

  it('blocks simulated logging when user is missing', async () => {
    render(<PhoneAgent />);

    const simulateButton = screen.getByTestId('simulate-call');
    await act(async () => {
      await userEvent.click(simulateButton);
    });

    expect(await screen.findByText('Sign in to log and view phone calls.')).toBeInTheDocument();
    expect(simulateInboundCall).not.toHaveBeenCalled();
  });
});
