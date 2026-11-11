// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), signIn: vi.fn(), params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }), useSearchParams: () => mocks.params }));
vi.mock('next-auth/react', () => ({ signIn: mocks.signIn }));
import Login from '@/app/login/page';
import Register from '@/app/register/page';
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.params = new URLSearchParams(); });

describe('login form', () => {
  async function submit() {
    await userEvent.type(screen.getByLabelText('Email', { exact: true }), 'alex@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  }
  function expectEmptyCredentials() {
    expect(screen.getByLabelText('Email', { exact: true })).toHaveValue('');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('');
  }
  it('starts empty and requests no saved login autofill', () => {
    render(<Login />);
    expectEmptyCredentials();
    expect(screen.getByLabelText('Email', { exact: true })).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Email', { exact: true })).toHaveAttribute('autocomplete', 'off');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
  });
  it('signs in without exposing credentials in a redirect URL', async () => {
    mocks.signIn.mockResolvedValue({ ok: true }); render(<Login />); await submit();
    expect(mocks.signIn).toHaveBeenCalledWith('credentials', { redirect: false, email: 'alex@example.com', password: 'password' });
    expect(mocks.push).toHaveBeenCalledWith('/dashboard');
    expect(mocks.refresh).toHaveBeenCalled();
    expectEmptyCredentials();
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('readonly');
  });
  it('reports invalid credentials and allows retry', async () => {
    mocks.signIn.mockResolvedValue({ error: 'Incorrect password' }); render(<Login />); await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Incorrect password');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
    expect(mocks.push).not.toHaveBeenCalled();
    expectEmptyCredentials();
  });
  it('reports a network failure', async () => {
    mocks.signIn.mockRejectedValue(new Error('Network unavailable')); render(<Login />); await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
    expectEmptyCredentials();
  });
  it('does not navigate when sign-in returns no success response', async () => {
    mocks.signIn.mockResolvedValue(undefined); render(<Login />); await submit();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to sign in');
    expectEmptyCredentials();
  });
  it('clears repeated delayed DOM autofill after the initial mount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<Login />);
    const email = screen.getByLabelText<HTMLInputElement>('Email', { exact: true });
    const password = screen.getByLabelText<HTMLInputElement>('Password', { exact: true });
    for (let attempt = 0; attempt < 3; attempt++) {
      email.value = 'previous@example.com';
      password.value = 'previous-password';
      act(() => vi.advanceTimersByTime(250));
      expectEmptyCredentials();
    }
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('ignores autofill change events before a field is focused', () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText('Email', { exact: true }), { target: { value: 'previous@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'previous-password' } });
    expectEmptyCredentials();
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your email and password');
  });
  it('discards a restored value immediately on first focus', async () => {
    render(<Login />);
    const email = screen.getByLabelText<HTMLInputElement>('Email', { exact: true });
    email.value = 'previous@example.com';
    await userEvent.click(email);
    expect(email).toHaveValue('');
    expect(email).not.toHaveAttribute('readonly');
  });
  it('preserves intentional typing and paste during background checks and refocus', async () => {
    const user = userEvent.setup();
    render(<Login />);
    await user.type(screen.getByLabelText('Email', { exact: true }), 'next@example.com');
    await user.click(screen.getByLabelText('Password', { exact: true }));
    await user.paste('fresh-password');
    await user.click(screen.getByLabelText('Email', { exact: true }));
    // Timer checks must never erase a person already entering their details.
    await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 750)); });
    fireEvent(window, new Event('focus'));
    expect(screen.getByLabelText('Email', { exact: true })).toHaveValue('next@example.com');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('fresh-password');
  });
  it.each(['pageshow', 'pagehide'])('clears and relocks credentials on %s', async event => {
    render(<Login />);
    await userEvent.type(screen.getByLabelText('Email', { exact: true }), 'previous@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'previous-password');
    fireEvent(window, new Event(event));
    expectEmptyCredentials();
    expect(screen.getByLabelText('Email', { exact: true })).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('readonly');
  });
  it('announces successful registration', () => {
    mocks.params = new URLSearchParams('registered=true'); render(<Login />);
    expect(screen.getByRole('status')).toHaveTextContent('Registration successful');
  });
});
describe('registration form', () => {
  it('switches required fields between student and instructor roles', async () => {
    render(<Register />);
    expect(screen.getByLabelText('Registration Number')).toBeRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Instructor' }));
    expect(screen.queryByLabelText('Registration Number')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Instructor ID')).toBeRequired();
    expect(screen.getByRole('button', { name: 'Instructor' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('submits instructor data and navigates after creation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }); vi.stubGlobal('fetch', fetchMock);
    render(<Register />);
    await userEvent.click(screen.getByRole('button', { name: 'Instructor' }));
    for (const [label, value] of [['Full Name', 'Alex'], ['Email', 'alex@example.com'], ['Password', 'password'], ['Instructor ID', 'I1']]) await userEvent.type(screen.getByLabelText(label, { exact: true }), value);
    await userEvent.selectOptions(screen.getByLabelText('Department'), 'Computer Science');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login?registered=true'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ role: 'instructor', instructorId: 'I1' });
  });
});
