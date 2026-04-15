const { check, body } = require('express-validator');

const validStatuses = ['pending', 'in-progress', 'completed'];
const validPriorities = ['low', 'medium', 'high'];

const sanitizeDueDate = value => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

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
  body('status').optional().customSanitizer(value => (validStatuses.includes(value) ? value : undefined)),
  body('priority').optional().customSanitizer(value => (validPriorities.includes(value) ? value : undefined)),
  body('dueDate')
    .optional({ checkFalsy: true })
    .customSanitizer(sanitizeDueDate)
];

exports.updateTaskValidation = [
  check('title').optional().not().isEmpty().trim().escape(),
  body('description').optional().trim().escape(),
  body('status').optional().customSanitizer(value => (validStatuses.includes(value) ? value : undefined)),
  body('priority').optional().customSanitizer(value => (validPriorities.includes(value) ? value : undefined)),
  body('dueDate')
    .optional({ checkFalsy: true })
    .customSanitizer(sanitizeDueDate)
];