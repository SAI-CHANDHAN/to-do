const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const csrfProtection = require('../middleware/csrf');
const { cacheTasks } = require('../middleware/cache');
const { createTaskValidation, updateTaskValidation } = require('../middleware/sanitize');

// @route   GET api/tasks
// @desc    Get all tasks
// @access  Private
router.get('/', auth, cacheTasks, taskController.getTasks);

// @route   GET api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', auth, taskController.getTaskById);

// @route   POST api/tasks
// @desc    Create a task
// @access  Private
router.post(
  '/',
  [csrfProtection, auth, createTaskValidation],
  taskController.createTask
);

// @route   PUT api/tasks/:id
// @desc    Update a task
// @access  Private
router.put(
  '/:id', 
  [csrfProtection, auth, updateTaskValidation],
  taskController.updateTask
);

// @route   DELETE api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', [csrfProtection, auth], taskController.deleteTask);

module.exports = router;