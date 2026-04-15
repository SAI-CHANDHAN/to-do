const Task = require('../models/Task');
const { validationResult } = require('express-validator');
const { clearTaskCache, setCachedTasks } = require('../config/redis');

// Get all tasks
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    const response = {
      success: true,
      data: tasks,
      message: 'Tasks fetched successfully',
      errors: null
    };

    await setCachedTasks(req.user.id, response);
    res.json({
      ...response
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

// Get task by ID
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    // Check if task exists
    if (!task) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Task not found',
        errors: null
      });
    }
    
    // Check user owns task
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Not authorized',
        errors: null
      });
    }

    res.json({
      success: true,
      data: task,
      message: 'Task fetched successfully',
      errors: null
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Task not found',
        errors: null
      });
    }
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

// Create task
exports.createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('[tasks] create validation failed', errors.array());
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { title, description, status, priority, dueDate } = req.body;

  try {
    const taskPayload = {
      title,
      description,
      status,
      priority,
      user: req.user.id
    };

    if (dueDate) {
      taskPayload.dueDate = dueDate;
    }

    const newTask = new Task(taskPayload);

    const task = await newTask.save();
    await clearTaskCache(req.user.id);
    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully',
      errors: null
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('[tasks] update validation failed', errors.array());
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { title, description, status, priority, dueDate } = req.body;

  // Build task object
  const taskFields = {};
  if (title !== undefined) taskFields.title = title;
  if (description !== undefined) taskFields.description = description;
  if (status !== undefined) taskFields.status = status;
  if (priority !== undefined) taskFields.priority = priority;
  if (dueDate !== undefined) {
    taskFields.dueDate = dueDate || null;
  }

  try {
    let task = await Task.findById(req.params.id);

    // Check if task exists
    if (!task) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Task not found',
        errors: null
      });
    }

    // Check user owns task
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Not authorized',
        errors: null
      });
    }

    // Update task
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: taskFields },
      { new: true }
    );

    await clearTaskCache(req.user.id);

    res.json({
      success: true,
      data: task,
      message: 'Task updated successfully',
      errors: null
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Task not found',
        errors: null
      });
    }
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    // Check if task exists
    if (!task) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Task not found',
        errors: null
      });
    }

    // Check user owns task
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Not authorized',
        errors: null
      });
    }

    await Task.findByIdAndDelete(req.params.id);
    await clearTaskCache(req.user.id);
    res.json({
      success: true,
      data: { id: req.params.id },
      message: 'Task removed successfully',
      errors: null
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Task not found',
        errors: null
      });
    }
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};