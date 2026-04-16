import React, { createContext, useReducer } from 'react';
import axios from 'axios';
import taskReducer from './taskReducer';
import getApiError from '../utils/getApiError';
import { apiUrl } from '../config/api';

// Initial State
const initialState = {
  tasks: [],
  currentTask: null,
  loading: true,
  error: null
};

// Create Context
export const TaskContext = createContext(initialState);

const normalizeTaskList = payload => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.tasks)) {
    return payload.tasks;
  }

  return [];
};

// Provider Component
export const TaskProvider = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // Get Tasks
  const getTasks = async () => {
    try {
      const res = await axios.get(apiUrl('/api/tasks'));
      dispatch({
        type: 'GET_TASKS',
        payload: normalizeTaskList(res.data?.data)
      });
    } catch (err) {
      dispatch({
        type: 'TASK_ERROR',
        payload: getApiError(err)
      });
    }
  };

  // Add Task
  const addTask = async task => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      const res = await axios.post(apiUrl('/api/tasks'), task, config);
      dispatch({
        type: 'ADD_TASK',
        payload: res.data.data
      });
    } catch (err) {
      dispatch({
        type: 'TASK_ERROR',
        payload: getApiError(err)
      });
    }
  };

  // Delete Task
  const deleteTask = async id => {
    try {
      await axios.delete(apiUrl(`/api/tasks/${id}`));
      dispatch({
        type: 'DELETE_TASK',
        payload: id
      });
    } catch (err) {
      dispatch({
        type: 'TASK_ERROR',
        payload: getApiError(err)
      });
    }
  };

  // Update Task
  const updateTask = async task => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      const res = await axios.put(apiUrl(`/api/tasks/${task._id}`), task, config);
      dispatch({
        type: 'UPDATE_TASK',
        payload: res.data.data
      });
    } catch (err) {
      dispatch({
        type: 'TASK_ERROR',
        payload: getApiError(err)
      });
    }
  };

  // Set Current Task
  const setCurrentTask = task => {
    dispatch({
      type: 'SET_CURRENT',
      payload: task
    });
  };

  // Clear Current Task
  const clearCurrentTask = () => {
    dispatch({ type: 'CLEAR_CURRENT' });
  };

  // Clear Errors
  const clearErrors = () => dispatch({ type: 'CLEAR_ERRORS' });

  return (
    <TaskContext.Provider
      value={{
        tasks: state.tasks,
        currentTask: state.currentTask,
        loading: state.loading,
        error: state.error,
        getTasks,
        addTask,
        deleteTask,
        updateTask,
        setCurrentTask,
        clearCurrentTask,
        clearErrors
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};