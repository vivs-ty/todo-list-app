import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/Auth', () => function AuthMock() {
  return <button type="button">Login</button>;
});

jest.mock('./components/Tasks', () => function TasksMock() {
  return <div>Tasks Area</div>;
});

beforeEach(() => {
  localStorage.clear();
});

test('renders the new app title', () => {
  render(<App />);
  expect(screen.getByText(/task atlas/i)).toBeInTheDocument();
});

test('shows login action when user is logged out', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});
