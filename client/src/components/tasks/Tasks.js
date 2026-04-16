import React, { useContext, useEffect, useMemo } from 'react';
import { TaskContext } from '../../context/TaskContext';
import TaskItem from './TaskItem';

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const Tasks = ({ filter }) => {
  const { tasks, getTasks, loading } = useContext(TaskContext);
  const safeFilter = (filter || '').trim();
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  useEffect(() => {
    getTasks();
    // eslint-disable-next-line
  }, []);

  const filteredTasks = useMemo(() => {
    if (!safeFilter) {
      return safeTasks;
    }

    const regex = new RegExp(escapeRegExp(safeFilter), 'i');

    return safeTasks.filter(task =>
      regex.test(task.title) || regex.test(task.description || '')
    );
  }, [safeTasks, safeFilter]);

  if (safeTasks.length === 0 && !loading && !safeFilter) {
    return <h4>Please add a task</h4>;
  }

  if (!loading && filteredTasks.length === 0) {
    return <h4>No tasks match your filter</h4>;
  }

  return (
    <>
      <div className="task-list" role="list" aria-label="Tasks">
        {!loading ? (
          filteredTasks.map(task => <TaskItem key={task._id} task={task} />)
        ) : (
          <div>Loading tasks...</div>
        )}
      </div>
    </>
  );
};

export default Tasks;