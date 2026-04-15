import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('axios', () => ({
  defaults: { headers: { common: {} } },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

test('renders the home page heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /task management app/i })).toBeInTheDocument();
});

test('renders guest navigation links', () => {
  render(<App />);
  expect(screen.getAllByRole('link', { name: /register/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('link', { name: /login/i }).length).toBeGreaterThan(0);
});
