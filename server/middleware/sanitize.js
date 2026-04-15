const { check, body } = require('express-validator');

exports.userValidation = [
  check('name', 'Name is required').not().isEmpty().trim().escape(),
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
];

exports.loginValidation = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password is required').exists()
];

exports.createTaskValidation = [
  check('title', 'Title is required').not().isEmpty().trim().escape(),
  body('description').optional().trim().escape(),
  check('status').optional().isIn(['pending', 'in-progress', 'completed']),
  check('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional({ checkFalsy: true }).isISO8601().toDate()
];

exports.updateTaskValidation = [
  check('title').optional().not().isEmpty().trim().escape(),
  body('description').optional().trim().escape(),
  check('status').optional().isIn(['pending', 'in-progress', 'completed']),
  check('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional({ checkFalsy: true }).isISO8601().toDate()
];