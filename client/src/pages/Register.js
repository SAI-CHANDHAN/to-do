import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../config/api';

const Register = () => {
  const navigate = useNavigate();
  const { register, error, clearErrors, isAuthenticated } = useContext(AuthContext);
  const [user, setUser] = useState({
    name: '',
    email: '',
    password: '',
    password2: ''
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

  const { name, email, password, password2 } = user;

  const onChange = e => setUser({ ...user, [e.target.name]: e.target.value });

  const onSubmit = e => {
    e.preventDefault();
    if (name === '' || email === '' || password === '') {
      setAlert('Please enter all fields');
    } else if (password !== password2) {
      setAlert('Passwords do not match');
    } else {
      register({
        name,
        email,
        password
      });
    }
  };

  const onGoogleRegister = () => {
    window.location.assign(apiUrl('/api/auth/google'));
  };

  return (
    <div className="form-container">
      <h1>
        Account <span className="text-primary">Register</span>
      </h1>
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            name="name"
            value={name}
            onChange={onChange}
            required
            aria-label="Name"
            aria-required="true"
          />
        </div>
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
            minLength="6"
            aria-label="Password"
            aria-required="true"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password2">Confirm Password</label>
          <input
            id="password2"
            type="password"
            name="password2"
            value={password2}
            onChange={onChange}
            required
            minLength="6"
            aria-label="Confirm Password"
            aria-required="true"
          />
        </div>
        {alert && <div className="alert alert-danger">{alert}</div>}
        <input
          type="submit"
          value="Register"
          className="btn btn-primary btn-block"
        />
        <button type="button" className="btn btn-light btn-block btn-google" onClick={onGoogleRegister}>
          Continue with Google
        </button>
      </form>
    </div>
  );
};

export default Register;