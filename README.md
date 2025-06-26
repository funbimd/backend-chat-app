# Backend Chat App

A Node.js backend for a real-time chat application with user authentication, friend management, messaging, and file upload support.

## Features
- User registration and authentication (JWT)
- Friend requests and management
- Real-time messaging (Socket.IO)
- File and image uploads (Cloudinary)
- Email notifications
- API documentation (Swagger)
- MongoDB (via Prisma)
- Input validation and error handling

## Getting Started

### Prerequisites
- Node.js >= 14
- npm
- MongoDB instance
- Cloudinary account (for file uploads)

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

### Database Setup
Run migrations and seed the database:
```bash
npx prisma migrate deploy
npm run seed
```

### Running the Server
```bash
npm start
```

### API Documentation
Visit `/api-docs` for Swagger UI.

## Testing
Sample tests can be added in the `tests/` directory. To run tests:
```bash
npm test
```

## Deployment
- Set environment variables in your production environment.
- Use a process manager like PM2 or deploy to a cloud provider (Heroku, Vercel, etc).

## Project Structure
- `controllers/` - Route handlers
- `routes/` - API routes
- `models/` - Mongoose/Prisma models
- `middleware/` - Express middlewares
- `services/` - External services (email, cloudinary)
- `socket/` - Socket.IO handlers
- `prisma/` - Prisma schema and migrations
- `utils/` - Utility functions
- `tests/` - Test files

## License
MIT
