import type { GuardianDetail } from '@school-mgmt/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as apiModule from '@/lib/api';
import { EditGuardianDialog } from './edit-guardian-dialog';

const guardian: GuardianDetail = {
  id: '0190a0a0-0000-7000-8000-000000000001',
  surname: 'Asamoah',
  firstName: 'Akosua',
  otherNames: null,
  primaryPhone: '+233244000102',
  secondaryPhone: null,
  whatsappPhone: '+233244000102',
  email: null,
  occupation: null,
  address: null,
  digitalAddress: null,
  photoUrl: null,
  children: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

function open(namesToo: boolean) {
  const send = vi.spyOn(apiModule, 'api').mockResolvedValue(guardian);
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EditGuardianDialog guardian={guardian} namesToo={namesToo} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { send, onClose, user: userEvent.setup() };
}

describe('EditGuardianDialog', () => {
  test('a class teacher sees contact details only', () => {
    open(false);
    expect(screen.getByLabelText('Main phone')).toHaveValue('024 400 0102');
    expect(screen.queryByLabelText('Surname')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Also use this for WhatsApp')).toBeChecked();
  });

  test('a new phone is sent with the WhatsApp number, then the form closes', async () => {
    const { send, onClose, user } = open(false);
    const phone = screen.getByLabelText('Main phone');
    await user.clear(phone);
    await user.type(phone, '020 111 2222');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(send).toHaveBeenCalledWith(`/guardians/${guardian.id}`, expect.anything(), {
      method: 'PATCH',
      body: { primaryPhone: '020 111 2222', whatsappPhone: '020 111 2222' },
    });
  });

  test('a wrong phone is explained beside the field and nothing is sent', async () => {
    const { send, user } = open(false);
    const phone = screen.getByLabelText('Main phone');
    await user.clear(phone);
    await user.type(phone, '12345');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(/valid Ghana phone number/)).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  test('saving without a change says so', async () => {
    const { send, user } = open(true);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing has changed yet.')).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });
});
