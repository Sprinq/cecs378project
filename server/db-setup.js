// db-setup.js - MongoDB initial setup script

// Import required modules
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./models/User');
const Server = require('./models/Server');
const Channel = require('./models/Channel');
const KeyExchange = require('./models/KeyExchange');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB for setup'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Create initial admin user
const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return existingAdmin;
    }
    
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('adminpassword', salt);
    
    // Create the admin user with a mock public key
    // In a real app, this would be generated properly
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      publicKey: 'MOCK_PUBLIC_KEY_FOR_ADMIN_USER',
      status: 'online'
    });
    
    await adminUser.save();
    
    console.log('Admin user created successfully');
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

// Create initial server and channels
const createInitialServer = async (adminUser) => {
  try {
    // Check if server already exists
    const existingServer = await Server.findOne({ name: 'General' });
    
    if (existingServer) {
      console.log('Initial server already exists');
      return existingServer;
    }
    
    // Create general server
    const generalServer = new Server({
      name: 'General',
      icon: '',
      owner: adminUser._id,
      members: [adminUser._id]
    });
    
    await generalServer.save();
    
    // Create default channels
    const welcomeChannel = new Channel({
      name: 'welcome',
      server: generalServer._id,
      type: 'text'
    });
    
    const generalChannel = new Channel({
      name: 'general',
      server: generalServer._id,
      type: 'text'
    });
    
    await welcomeChannel.save();
    await generalChannel.save();
    
    // Add channels to server
    generalServer.channels = [welcomeChannel._id, generalChannel._id];
    await generalServer.save();
    
    // Add server to admin user's servers
    adminUser.servers.push(generalServer._id);
    await adminUser.save();
    
    console.log('Initial server and channels created successfully');
    return generalServer;
  } catch (error) {
    console.error('Error creating initial server:', error);
    throw error;
  }
};

// Create key exchange entry for admin
const createAdminKeyExchange = async (adminUser) => {
  try {
    // Check if key exchange entry already exists
    const existingKeyExchange = await KeyExchange.findOne({ user: adminUser._id });
    
    if (existingKeyExchange) {
      console.log('Admin key exchange entry already exists');
      return existingKeyExchange;
    }
    
    // Create key exchange entry
    const keyExchange = new KeyExchange({
      user: adminUser._id,
      publicKey: adminUser.publicKey,
      deviceId: 'admin-device-id'
    });
    
    await keyExchange.save();
    
    console.log('Admin key exchange entry created successfully');
    return keyExchange;
  } catch (error) {
    console.error('Error creating admin key exchange entry:', error);
    throw error;
  }
};

// Create some test users
const createTestUsers = async (generalServer) => {
  try {
    const testUsers = [
      { username: 'alice', email: 'alice@example.com', password: 'password123' },
      { username: 'bob', email: 'bob@example.com', password: 'password123' }
    ];
    
    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ username: userData.username });
      
      if (existingUser) {
        console.log(`Test user ${userData.username} already exists`);
        continue;
      }
      
      // Generate salt and hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create the user
      const user = new User({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        publicKey: `MOCK_PUBLIC_KEY_FOR_${userData.username.toUpperCase()}`,
        status: 'offline',
        servers: [generalServer._id]
      });
      
      await user.save();
      
      // Create key exchange entry
      const keyExchange = new KeyExchange({
        user: user._id,
        publicKey: user.publicKey,
        deviceId: `${userData.username}-device-id`
      });
      
      await keyExchange.save();
      
      // Add user to server members
      generalServer.members.push(user._id);
      
      console.log(`Test user ${userData.username} created successfully`);
    }
    
    // Save server with new members
    await generalServer.save();
    
    console.log('Test users created successfully');
  } catch (error) {
    console.error('Error creating test users:', error);
    throw error;
  }
};

// Main setup function
const setupDatabase = async () => {
  try {
    console.log('Starting database setup...');
    
    // Create admin user
    const adminUser = await createAdminUser();
    
    // Create initial server and channels
    const generalServer = await createInitialServer(adminUser);
    
    // Create admin key exchange entry
    await createAdminKeyExchange(adminUser);
    
    // Create test users
    await createTestUsers(generalServer);
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the setup
setupDatabase();