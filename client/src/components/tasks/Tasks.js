import React, { useContext, useEffect, useMemo } from 'react';
import { TaskContext } from '../../context/TaskContext';
import TaskItem from './TaskItem';

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const Tasks = ({ filter }) => {
  const { tasks, getTasks, loading } = useContext(TaskContext);

  useEffect(() => {
    getTasks();
    // eslint-disable-next-line
  }, []);

  const filteredTasks = useMemo(() => {
    if (!tasks || !filter.trim()) {
      return tasks || [];
    }

    const regex = new RegExp(escapeRegExp(filter.trim()), 'i');

    return tasks.filter(task =>
      regex.test(task.title) || regex.test(task.description || '')
    );
  }, [tasks, filter]);

  if (tasks !== null && tasks.length === 0 && !loading) {
    return <h4>Please add a task</h4>;
  }

  if (!loading && filteredTasks.length === 0) {
    return <h4>No tasks match your filter</h4>;
  }

  return (
    <>
      <div className="task-list" role="list" aria-label="Tasks">
        {tasks !== null && !loading ? (
          filteredTasks.map(task => <TaskItem key={task._id} task={task} />)
        ) : (
          <div>Loading tasks...</div>
        )}
      </div>
    </>
  );
};

export default Tasks;