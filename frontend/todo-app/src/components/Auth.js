import React, { useState } from 'react';
import { registerUser, loginUser } from '../services/api';

const Auth = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = () => {
    setPassword('');
    setErrorMessage('');
  };

  const extractErrorMessage = (error) => {
    if (error.response?.data?.detail) {
      return String(error.response.data.detail);
    }
    if (error.message) {
      return error.message;
    }
    return 'Authentication failed. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Username and password are required.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await registerUser({ username: username.trim(), password });
      }

      const response = await loginUser({ username: username.trim(), password });
      const token = response.data?.access_token || response.data?.token;

      if (!token) {
        throw new Error('Login succeeded but no token was returned.');
      }

      localStorage.setItem('token', token);
      onLogin();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <h2>Plan better days</h2>
        <p>
          Create focused task cycles with status tracking, quick edits, and progress insights.
        </p>
        <ul className="auth-highlights">
          <li>Fast task creation and updates</li>
          <li>Smart filters to stay on target</li>
          <li>Works even when the API is flaky</li>
        </ul>
      </aside>

      <form className="auth-form" onSubmit={handleSubmit}>
        <h3>{isRegister ? 'Create account' : 'Welcome back'}</h3>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          placeholder="e.g. alex"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="At least 1 character"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />

        {errorMessage ? <p className="status-error">{errorMessage}</p> : null}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Working...' : isRegister ? 'Register & Login' : 'Login'}
        </button>

        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            localStorage.setItem('token', 'demo-token');
            onLogin();
          }}
        >
          Try Demo Workspace
        </button>

        <button
          className="link-button"
          type="button"
          onClick={() => {
            setIsRegister((previous) => !previous);
            resetState();
          }}
        >
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </form>
    </div>
  );
};

export default Auth;
