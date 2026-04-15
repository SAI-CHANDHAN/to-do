const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    data: null,
    message: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message,
    errors: [err.message]
  });
};

module.exports = errorHandler;