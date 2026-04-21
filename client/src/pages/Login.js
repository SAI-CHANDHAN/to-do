import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL as API_URL } from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithMfa, recoverMfaLogin, error, clearErrors, isAuthenticated } = useContext(AuthContext);
  const [user, setUser] = useState({
    email: '',
    password: ''
  });
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [alert, setAlert] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('oauthError');
    if (oauthError) {
      setAlert(`Google login failed: ${decodeURIComponent(oauthError)}`);
    }

    if (isAuthenticated) {
      navigate('/dashboard');
    }

    if (error) {
      setAlert(error);
      clearErrors();
    }
    // eslint-disable-next-line
  }, [error, isAuthenticated, location.search]);

  const { email, password } = user;

  const onChange = e => setUser({ ...user, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    if (email === '' || password === '') {
      setAlert('Please fill in all fields');
    } else {
      const result = await login({
        email,
        password
      });

      if (result?.mfaRequired) {
        setMfaRequired(true);
        setMfaToken(result.mfaToken);
        setAlert('Enter the 6-digit code from your authenticator app');
      }
    }
  };

  const onSubmitMfa = async e => {
    e.preventDefault();
    if (!mfaOtp.trim()) {
      setAlert('Please enter your MFA code');
      return;
    }

    await loginWithMfa({
      mfaToken,
      otp: mfaOtp.trim()
    });
  };

  const onGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const onRecoverMfa = async () => {
    if (!mfaToken) {
      setAlert('MFA challenge expired. Please login again.');
      setMfaRequired(false);
      return;
    }

    const result = await recoverMfaLogin(mfaToken);
    if (!result.success) {
      setAlert(result.error || 'Unable to reset MFA. Please try again.');
      return;
    }

    setAlert(result.message || 'MFA reset completed. Please set it up again from your dashboard.');
  };

  return (
    <div className="form-container">
      <h1>
        Account <span className="text-primary">Login</span>
      </h1>
      {!mfaRequired ? (
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={onChange}
              required
              aria-label="Email Address"
              aria-required="true"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={onChange}
              required
              aria-label="Password"
              aria-required="true"
            />
          </div>
          {alert && <div className="alert alert-danger">{alert}</div>}
          <input
            type="submit"
            value="Login"
            className="btn btn-primary btn-block"
          />
          <button type="button" className="btn btn-light btn-block btn-google" onClick={onGoogleLogin}>
            Continue with Google
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitMfa}>
          <div className="form-group">
            <label htmlFor="mfaOtp">Authenticator Code</label>
            <input
              id="mfaOtp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={mfaOtp}
              onChange={e => setMfaOtp(e.target.value)}
              required
              maxLength="6"
              aria-label="MFA Code"
            />
          </div>
          {alert && <div className="alert alert-danger">{alert}</div>}
          <input
            type="submit"
            value="Verify MFA"
            className="btn btn-primary btn-block"
          />
          <button type="button" className="btn btn-light btn-block" onClick={onRecoverMfa}>
            I removed my authenticator app, reset MFA
          </button>
        </form>
      )}
    </div>
  );
};

export default Login;