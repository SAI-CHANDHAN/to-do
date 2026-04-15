const { getCachedTasks } = require('../config/redis');

const cacheTasks = async (req, res, next) => {
  try {
    const cached = await getCachedTasks(req.user.id);
    if (cached) {
      return res.json(cached);
    }
  } catch (error) {
    console.error('Cache middleware error:', error.message);
  }

  return next();
};

module.exports = {
  cacheTasks
};