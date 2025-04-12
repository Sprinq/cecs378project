# SecureChat - End-to-End Encrypted Messaging Platform

SecureChat is a Discord-like secure messaging platform with end-to-end encryption for all messages. This application provides a real-time messaging experience with a focus on privacy and security.

## Features

- End-to-End Encryption: All messages are encrypted using AES-256-GCM encryption
- User Authentication: Secure registration and login system
- Server & Channel Organization: Similar to Discord's structure
- Real-time Messaging: Using Socket.IO for instant communication
- Responsive Design: Works on desktop and mobile devices
- Key Exchange Mechanism: Allows secure sharing of channel keys
- Message Editing & Deletion: With preserved encryption
- Typing Indicators: See when others are typing
- User Status: Show online/offline status

## Technology Stack

### Frontend
- React.js
- React Router for navigation
- Socket.IO Client for WebSockets
- Web Crypto API for encryption
- Tailwind CSS for styling

### Backend
- Node.js with Express
- Socket.IO for real-time communication
- MongoDB for data storage
- JWT for authentication
- bcrypt for password hashing

## Security Architecture

### End-to-End Encryption
SecureChat implements a hybrid encryption system:

1. Asymmetric Encryption (RSA-OAEP):
   - Each user generates a public-private key pair during registration
   - Public keys are stored on the server and shared with other users
   - Private keys never leave the user's device (stored in IndexedDB)

2. Symmetric Encryption (AES-256-GCM):
   - Each channel has a unique symmetric key for encrypting messages
   - Channel keys are shared securely using the recipients' public keys
   - Messages are encrypted on the sender's device and can only be decrypted by channel members

3. Key Management:
   - Keys are stored locally using IndexedDB
   - Support for multiple device key synchronization
   - Channel keys are distributed securely using asymmetric encryption

### Data Storage
- All message content is stored encrypted in the database
- The server cannot decrypt message content - true end-to-end encryption
- Only encrypted data and required metadata are stored on the server
- User passwords are hashed with bcrypt before storage

## Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (v4+)
- npm or yarn

### Backend Setup
1. Clone the repository
   git clone https://github.com/yourusername/securechat.git
   cd securechat/server

2. Install dependencies
   npm install

3. Create a .env file (use .env.sample as a template)
   cp .env.sample .env

4. Edit the .env file with your settings
   - Generate strong random strings for JWT secrets
   - Set your MongoDB connection string

5. Run the database setup script
   node db-setup.js

6. Start the server
   npm run dev

### Frontend Setup
1. Navigate to the client directory
   cd ../client

2. Install dependencies
   npm install

3. Create a .env file
   cp .env.sample .env

4. Edit the .env file
   - Set REACT_APP_API_URL to your backend URL (default: http://localhost:5000)

5. Start the React development server
   npm start

6. Access the application at http://localhost:3000

## Deployment

### Backend
- Deploy the Node.js application to a platform like Heroku, AWS, or DigitalOcean
- Set up a MongoDB Atlas database for production
- Configure proper environment variables
- Use a process manager like PM2 for reliability

### Frontend
- Build the React application for production
  npm run build
- Deploy the static files to a service like Netlify, Vercel, or Amazon S3
- Configure the production API URL in the environment variables

## Security Considerations

- Keep your JWT secrets secure and rotate them periodically
- Use HTTPS in production
- Implement rate limiting to prevent brute force attacks
- Consider adding two-factor authentication for added security
- Regularly update dependencies to patch security vulnerabilities
- Set up proper CORS configuration to restrict API access

## Future Enhancements

- Voice and video chat with encryption
- File sharing with end-to-end encryption
- Message reactions and threading
- Role-based permissions
- Message search (with client-side indexing for encrypted content)
- Mobile apps using React Native
- Self-destructing messages
- Secure key backup and recovery options

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- The Web Crypto API for providing cryptographic capabilities
- Socket.IO for real-time communication
- MongoDB for flexible data storage
- React and Tailwind CSS for the frontend UI