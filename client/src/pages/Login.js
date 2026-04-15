import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, error, clearErrors, isAuthenticated } = useContext(AuthContext);
  const [user, setUser] = useState({
    email: '',
    password: ''
  });
  const [alert, setAlert] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }

    if (error) {
      setAlert(error);
      clearErrors();
    }
    // eslint-disable-next-line
  }, [error, isAuthenticated]);

  const { email, password } = user;

  const onChange = e => setUser({ ...user, [e.target.name]: e.target.value });

  const onSubmit = e => {
    e.preventDefault();
    if (email === '' || password === '') {
      setAlert('Please fill in all fields');
    } else {
      login({
        email,
        password
      });
    }
  };

  const onGoogleLogin = () => {
    window.location.assign(apiUrl('/api/auth/google'));
  };

  return (
    <div className="form-container">
      <h1>
        Account <span className="text-primary">Login</span>
      </h1>
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
    </div>
  );
};

export default Login;