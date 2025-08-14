import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Chat from '../../../models/Chat';
import Message from '../../../models/Message';

// GET /api/chats - Get all chats for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const chats = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

// POST /api/chats - Create a new chat
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, title, preview, firstMessage } = body;

    if (!userId || !title || !preview || !firstMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create new chat
    const chat = new Chat({
      userId,
      title,
      preview,
      messageCount: 1,
      lastMessage: firstMessage,
    });

    const savedChat = await chat.save();

    // Create first message
    const message = new Message({
      chatId: savedChat._id.toString(),
      content: firstMessage,
      role: 'user',
      timestamp: new Date(),
    });

    await message.save();

    return NextResponse.json(savedChat, { status: 201 });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
