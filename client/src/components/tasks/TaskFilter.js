import React from 'react';

const TaskFilter = ({ filter, onFilterChange }) => {

  return (
    <form>
      <div className="form-group">
        <label htmlFor="filter">Filter Tasks</label>
        <input 
          id="filter"
          type="text" 
          placeholder="Search tasks..." 
          value={filter}
          onChange={onFilterChange}
          aria-label="Filter tasks"
        />
      </div>
    </form>
  );
};

export default TaskFilter;