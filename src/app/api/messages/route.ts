import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Message from '../../../models/Message';
import Chat from '../../../models/Chat';

// POST /api/messages - Add a new message to a chat
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { chatId, content, role, userId, timestamp } = body;

    if (!chatId || !content || !role || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify chat exists and belongs to user
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Create new message
    const message = new Message({
      chatId,
      content,
      role,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    const savedMessage = await message.save();

    // Update chat with new message count and last message
    await Chat.findByIdAndUpdate(chatId, {
      $inc: { messageCount: 1 },
      lastMessage: content,
      updatedAt: new Date(),
    });

    return NextResponse.json(savedMessage, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
