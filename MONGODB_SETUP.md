# MongoDB Setup Guide

## Prerequisites

1. **MongoDB Installation**
   - Install MongoDB Community Server: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/atlas

2. **Environment Configuration**
   Create a `.env.local` file in the root directory with:
   ```
   MONGODB_URI=mongodb://localhost:27017/vitelis_chat
   ```

## Local MongoDB Setup

### Option 1: Local MongoDB
1. Install MongoDB Community Server
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/vitelis_chat`

### Option 2: MongoDB Atlas (Recommended for Production)
1. Create free account at MongoDB Atlas
2. Create a new cluster
3. Get connection string from "Connect" button
4. Replace username, password, and cluster details
5. Use connection string: `mongodb+srv://username:password@cluster.mongodb.net/vitelis_chat?retryWrites=true&w=majority`

## Database Structure

The application creates two collections:

### `chats` Collection
- `_id`: Unique chat identifier
- `userId`: User email (used as user identifier)
- `title`: Chat title
- `preview`: Chat preview text
- `messageCount`: Number of messages in chat
- `lastMessage`: Last message content
- `createdAt`: Chat creation timestamp
- `updatedAt`: Last update timestamp

### `messages` Collection
- `_id`: Unique message identifier
- `chatId`: Reference to chat
- `content`: Message content
- `role`: 'user' or 'assistant'
- `timestamp`: Message timestamp
- `createdAt`: Message creation timestamp
- `updatedAt`: Last update timestamp

## API Endpoints

### Chats
- `GET /api/chats?userId=email` - Get all chats for user
- `POST /api/chats` - Create new chat
- `GET /api/chats/[chatId]?userId=email` - Get specific chat with messages
- `PUT /api/chats/[chatId]` - Update chat title
- `DELETE /api/chats/[chatId]?userId=email` - Delete chat

### Messages
- `POST /api/messages` - Add message to chat

## Features

✅ **Real-time Chat**: Messages are saved to MongoDB
✅ **Chat History**: View and manage previous conversations
✅ **Persistent Storage**: All data persists across sessions
✅ **User Isolation**: Each user sees only their own chats
✅ **Error Handling**: Proper error messages and fallbacks
✅ **Loading States**: Smooth loading indicators

## Troubleshooting

### Connection Issues
1. Check MongoDB service is running
2. Verify connection string in `.env.local`
3. Check network connectivity (for Atlas)

### Database Issues
1. Ensure MongoDB is accessible
2. Check user permissions
3. Verify database name in connection string

### API Issues
1. Check server logs for errors
2. Verify API routes are accessible
3. Check request/response format
