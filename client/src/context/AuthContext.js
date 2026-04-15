import React, { createContext, useEffect, useReducer } from 'react';
import axios from 'axios';
import authReducer from './authReducer';
import getApiError from '../utils/getApiError';
import { apiUrl } from '../config/api';

axios.defaults.withCredentials = true;

const getCookie = name => {
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
};

// Initial State
const initialState = {
  isAuthenticated: null,
  loading: true,
  user: null,
  error: null
};

// Create Context
export const AuthContext = createContext(initialState);

// Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    console.log('[auth-client] state changed', {
      isAuthenticated: state.isAuthenticated,
      loading: state.loading,
      hasUser: Boolean(state.user),
      error: state.error || null
    });
  }, [state.isAuthenticated, state.loading, state.user, state.error]);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(config => {
      const method = (config.method || 'get').toLowerCase();
      if (!['get', 'head', 'options'].includes(method)) {
        const token = getCookie('csrfToken');
        if (token) {
          config.headers = config.headers || {};
          config.headers['x-csrf-token'] = token;
        }
      }
      return config;
    });

    let isRefreshing = false;
    const refreshSubscribers = [];

    const notifySubscribers = error => {
      refreshSubscribers.splice(0).forEach(callback => callback(error));
    };

    const addSubscriber = callback => {
      refreshSubscribers.push(callback);
    };

    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (
          error.response?.status !== 401 ||
          originalRequest?._retry ||
          originalRequest?.url?.includes('/api/auth/refresh') ||
          originalRequest?.url?.includes('/api/auth/login') ||
          originalRequest?.url?.includes('/api/auth/register')
        ) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            addSubscriber(error => {
              if (error) {
                reject(error);
                return;
              }

              resolve(axios(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshHeaders = {};
          const refreshCsrf = getCookie('csrfToken');
          if (refreshCsrf) {
            refreshHeaders['x-csrf-token'] = refreshCsrf;
          }

          await axios.post(apiUrl('/api/auth/refresh'), {}, {
            withCredentials: true,
            headers: refreshHeaders
          });
          console.log('[auth-client] refresh success');
          notifySubscribers(null);
          return axios(originalRequest);
        } catch (refreshError) {
          console.warn('[auth-client] refresh failed', refreshError?.response?.data || refreshError.message);
          notifySubscribers(refreshError);
          dispatch({ type: 'AUTH_INIT' });
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Load User
  const loadUser = async () => {
    try {
      const res = await axios.get(apiUrl('/api/auth'), { withCredentials: true });
      dispatch({
        type: 'USER_LOADED',
        payload: res.data.data
      });
      console.log('[auth-client] user loaded');
      return true;
    } catch (err) {
      console.warn('[auth-client] loadUser failed', err?.response?.data || err.message);
      dispatch({ type: 'AUTH_INIT' });
      return false;
    }
  };

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register User
  const register = async formData => {
    try {
      const res = await axios.post(apiUrl('/api/auth/register'), formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('[auth-client] register success');
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: res.data.data.user
      });
      return { success: true, data: res.data.data };
    } catch (err) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: getApiError(err)
      });
      return { success: false, error: getApiError(err) };
    }
  };

  // Login User
  const login = async formData => {
    try {
      const res = await axios.post(apiUrl('/api/auth/login'), formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.data?.data?.mfaRequired) {
        return {
          success: true,
          mfaRequired: true,
          mfaToken: res.data.data.mfaToken
        };
      }

      console.log('[auth-client] login success');
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: res.data.data.user
      });
      return { success: true, mfaRequired: false };
    } catch (err) {
      const message = getApiError(err);
      dispatch({
        type: 'AUTH_ERROR',
        payload: message
      });
      return { success: false, error: message };
    }
  };

  const loginWithMfa = async ({ mfaToken, otp }) => {
    try {
      const res = await axios.post(
        apiUrl('/api/auth/mfa/login'),
        { mfaToken, otp },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: res.data.data.user
      });

      return { success: true };
    } catch (err) {
      const message = getApiError(err);
      dispatch({
        type: 'AUTH_ERROR',
        payload: message
      });
      return { success: false, error: message };
    }
  };

  const setupMfa = async () => {
    try {
      const res = await axios.post(apiUrl('/api/auth/mfa/setup'), {}, { withCredentials: true });
      return { success: true, data: res.data.data };
    } catch (err) {
      const message = getApiError(err);
      dispatch({
        type: 'AUTH_ERROR',
        payload: message
      });
      return { success: false, error: message };
    }
  };

  const verifyMfaSetup = async otp => {
    try {
      const res = await axios.post(
        apiUrl('/api/auth/mfa/verify'),
        { otp },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      await loadUser();
      return { success: true, data: res.data.data };
    } catch (err) {
      const message = getApiError(err);
      dispatch({
        type: 'AUTH_ERROR',
        payload: message
      });
      return { success: false, error: message };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await axios.post(apiUrl('/api/auth/logout'), {}, { withCredentials: true });
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Clear Errors
  const clearErrors = () => dispatch({ type: 'CLEAR_ERRORS' });

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        user: state.user,
        error: state.error,
        register,
        login,
        loginWithMfa,
        setupMfa,
        verifyMfaSetup,
        logout,
        loadUser,
        clearErrors
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};