// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
  it('signs in without exposing credentials in a redirect URL', async () => {
    mocks.signIn.mockResolvedValue({ ok: true }); render(<Login />); await submit();
    expect(mocks.signIn).toHaveBeenCalledWith('credentials', { redirect: false, email: 'alex@example.com', password: 'password' });
    expect(mocks.push).toHaveBeenCalledWith('/dashboard');
    expect(mocks.refresh).toHaveBeenCalled();
  });
  it('reports invalid credentials and allows retry', async () => {
    mocks.signIn.mockResolvedValue({ error: 'Incorrect password' }); render(<Login />); await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Incorrect password');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it('reports a network failure', async () => {
    mocks.signIn.mockRejectedValue(new Error('Network unavailable')); render(<Login />); await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
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
