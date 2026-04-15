import React, { useState, useContext, useEffect } from 'react';
import { TaskContext } from '../../context/TaskContext';

const TaskForm = () => {
  const { addTask, updateTask, clearCurrentTask, currentTask } = useContext(TaskContext);

  const [task, setTask] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: ''
  });

  useEffect(() => {
    if (currentTask !== null) {
      setTask(currentTask);
    } else {
      setTask({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        dueDate: ''
      });
    }
  }, [currentTask]);

  const { title, description, status, priority, dueDate } = task;

  const onChange = e => setTask({ ...task, [e.target.name]: e.target.value });

  const onSubmit = e => {
    e.preventDefault();
    if (currentTask === null) {
      addTask(task);
    } else {
      updateTask(task);
    }
    clearAll();
  };

  const clearAll = () => {
    clearCurrentTask();
  };

  return (
    <form onSubmit={onSubmit}>
      <h2 className="text-primary">
        {currentTask ? 'Edit Task' : 'Add Task'}
      </h2>
      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          type="text"
          id="title"
          name="title"
          value={title}
          onChange={onChange}
          required
          aria-label="Task title"
          aria-required="true"
        />
      </div>
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={onChange}
          aria-label="Task description"
        />
      </div>
      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select 
          id="status"
          name="status" 
          value={status} 
          onChange={onChange}
          aria-label="Task status"
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="priority">Priority</label>
        <select 
          id="priority"
          name="priority" 
          value={priority} 
          onChange={onChange}
          aria-label="Task priority"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="dueDate">Due Date</label>
        <input
          type="date"
          id="dueDate"
          name="dueDate"
          value={dueDate ? dueDate.substring(0, 10) : ''}
          onChange={onChange}
          aria-label="Task due date"
        />
      </div>
      <div>
        <input
          type="submit"
          value={currentTask ? 'Update Task' : 'Add Task'}
          className="btn btn-primary btn-block"
        />
      </div>
      {currentTask && (
        <div>
          <button type="button" className="btn btn-light btn-block" onClick={clearAll}>
            Clear
          </button>
        </div>
      )}
    </form>
  );
};

export default TaskForm;