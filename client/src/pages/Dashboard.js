import React, { useContext, useState } from 'react';
import { TaskProvider } from '../context/TaskContext';
import { AuthContext } from '../context/AuthContext';
import TaskForm from '../components/tasks/TaskForm';
import TaskFilter from '../components/tasks/TaskFilter';
import Tasks from '../components/tasks/Tasks';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [filter, setFilter] = useState('');

  const onFilterChange = e => {
    setFilter(e.target.value);
  };

  return (
    <TaskProvider>
      <div className="grid-2">
        <div>
          <TaskForm />
        </div>
        <div>
          <h2>Welcome, {user && user.name}</h2>
          <TaskFilter filter={filter} onFilterChange={onFilterChange} />
          <Tasks filter={filter} />
        </div>
      </div>
    </TaskProvider>
  );
};

export default Dashboard;