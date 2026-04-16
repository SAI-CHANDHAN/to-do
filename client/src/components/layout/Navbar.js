import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout, user } = useContext(AuthContext);

  const onLogout = () => {
    logout();
  };

  const authLinks = (
    <>
      <li>Hello {user && user.name}</li>
      <li>
          <a onClick={onLogout} href="#!" aria-label="Logout">
          <i className="fas fa-sign-out-alt" />{' '}
          <span className="hide-sm">Logout</span>
        </a>
      </li>
    </>
  );

  const guestLinks = (
    <>
      <li>
        <Link to="/register" aria-label="Register">Register</Link>
      </li>
      <li>
        <Link to="/login" aria-label="Login">Login</Link>
      </li>
    </>
  );

  return (
    <div className="navbar bg-primary">
      <h1>
        <Link to="/" aria-label="Task Manager">
          <i className="fas fa-check-double" /> Tasque
        </Link>
      </h1>
      <ul>{isAuthenticated ? authLinks : guestLinks}</ul>
    </div>
  );
};

export default Navbar;