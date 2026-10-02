// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignInGitHub } from '@/components/auth/SignInGitHub';

const social = vi.fn();
vi.mock('@/lib/auth/client', () => ({ authClient: { signIn: { social: (...a: unknown[]) => social(...a) } } }));

afterEach(() => { cleanup(); social.mockReset(); });

const button = (getByText: (t: string) => HTMLElement) => getByText('Continue with GitHub').closest('button')!;

describe('<SignInGitHub />', () => {
  it('re-enables the button and reports the error when better-auth resolves { error }', async () => {
    social.mockResolvedValue({ data: null, error: { message: 'GitHub provider is not configured' } });
    const { getByText, getByRole } = render(<SignInGitHub />);
    fireEvent.click(button(getByText));
    await waitFor(() => expect(getByRole('alert').textContent).toBe('GitHub provider is not configured'));
    expect(button(getByText).disabled).toBe(false);
  });

  it('reports a thrown network failure instead of spinning forever', async () => {
    social.mockRejectedValue(new Error('fetch failed'));
    const { getByText, getByRole } = render(<SignInGitHub />);
    fireEvent.click(button(getByText));
    await waitFor(() => expect(getByRole('alert').textContent).toBe('Could not reach the server'));
    expect(button(getByText).disabled).toBe(false);
  });

  it('stays busy on success so the redirect is not interrupted', async () => {
    social.mockResolvedValue({ data: { url: 'https://github.com/login/oauth' }, error: null });
    const { getByText, queryByRole, container } = render(<SignInGitHub />);
    fireEvent.click(button(getByText));
    await waitFor(() => expect(container.querySelector('.spin')).toBeTruthy());
    expect(queryByRole('alert')).toBeNull();
    expect(button(getByText).disabled).toBe(true);
  });
});
