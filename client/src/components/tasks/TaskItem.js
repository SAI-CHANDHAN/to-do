import React, { useContext } from 'react';
import { TaskContext } from '../../context/TaskContext';

const TaskItem = ({ task }) => {
  const { deleteTask, setCurrentTask, clearCurrentTask } = useContext(TaskContext);
  const { _id, title, description, status, priority, dueDate } = task;

  const onEdit = () => {
    setCurrentTask(task);
  };

  const onDelete = () => {
    deleteTask(_id);
    clearCurrentTask();
  };

  const formatDate = (date) => {
    if (!date) return 'No due date';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'badge-danger';
      case 'medium':
        return 'badge-warning';
      case 'low':
        return 'badge-success';
      default:
        return '';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'badge-secondary';
      case 'in-progress':
        return 'badge-primary';
      case 'completed':
        return 'badge-success';
      default:
        return '';
    }
  };

  return (
    <div className="card bg-light" role="listitem">
      <h3 className="text-primary text-left">
        {title}{' '}
        <span 
          className={`badge ${getPriorityClass(priority)} float-right`}
          aria-label={`Priority: ${priority}`}
        >
          {priority}
        </span>
        <span 
          className={`badge ${getStatusClass(status)} float-right`}
          aria-label={`Status: ${status}`}
        >
          {status}
        </span>
      </h3>
      {description && <p>{description}</p>}
      <p>
        <span aria-label="Due date">Due: {formatDate(dueDate)}</span>
      </p>
      <p>
        <button 
          className="btn btn-dark btn-sm" 
          onClick={onEdit}
          aria-label="Edit task"
        >
          Edit
        </button>
        <button 
          className="btn btn-danger btn-sm" 
          onClick={onDelete}
          aria-label="Delete task"
        >
          Delete
        </button>
      </p>
    </div>
  );
};

export default TaskItem;