const User = require('../models/User');

const seedUsers = async () => {
  try {
    // Check if any users already exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already has users. Skipping seeder...');
      return;
    }

    console.log('No users found in database. Seeding default demo accounts...');

    const demoUsers = [
      {
        name: 'Saman Silva',
        email: 'saman@vau.ac.lk',
        password: 'admin123',
        role: 'student',
      },
      {
        name: 'Dr. Priya Perera',
        email: 'priya@vau.ac.lk',
        password: 'admin123',
        role: 'lecturer',
        department: 'Department of Computer Science',
      },
      {
        name: 'System Admin',
        email: 'admin@vau.ac.lk',
        password: 'admin123',
        role: 'admin',
      },
    ];

    // Using .create ensures the pre-save password hashing hook is executed for each user
    await User.create(demoUsers);
    console.log('Successfully seeded 3 demo users:');
    console.log(' - Student: saman@vau.ac.lk (admin123)');
    console.log(' - Lecturer: priya@vau.ac.lk (admin123)');
    console.log(' - Admin: admin@vau.ac.lk (admin123)');
  } catch (error) {
    console.error('Error seeding default users:', error);
  }
};

module.exports = seedUsers;
