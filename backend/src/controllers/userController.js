const User = require('../models/User');

// @desc    Get all users (e.g. to list lecturers)
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    // Return all users, excluding their password field
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error retrieving users list' });
  }
};

module.exports = {
  getUsers,
};
