// Jest setup for React Testing Library matchers
import '@testing-library/jest-dom';

// Default envs for tests (can be overridden in individual tests)
process.env.REACT_APP_CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || 'test_publishable_key';

// Reduce noisy logs in test output and filter known React act() warnings
const originalError = console.error;
beforeAll(() => {
	jest.spyOn(console, 'log').mockImplementation(() => {});
	jest.spyOn(console, 'warn').mockImplementation(() => {});
	jest.spyOn(console, 'error').mockImplementation((...args) => {
		const msg = args[0];
		if (typeof msg === 'string' && msg.includes('not wrapped in act')) {
			return; // suppress act() warnings in tests
		}
		originalError(...args);
	});
});

afterAll(() => {
	jest.restoreAllMocks();
});
