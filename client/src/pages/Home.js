import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <div className="home-page">
      <h1>Task Management App</h1>
      <p className="lead">
        A secure and accessible application to manage your tasks effectively
      </p>
      <div className="cta-buttons">
        {isAuthenticated ? (
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
            <Link to="/login" className="btn btn-light">
              Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;