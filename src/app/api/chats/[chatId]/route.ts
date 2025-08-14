import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Chat from '../../../../models/Chat';
import Message from '../../../../models/Message';

// GET /api/chats/[chatId] - Get a specific chat with messages
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    await connectDB();
    
    const { chatId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get chat
    const chat = await Chat.findOne({ _id: chatId, userId }).lean();
    
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Get messages for this chat
    const messages = await Message.find({ chatId })
      .sort({ timestamp: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ chat, messages });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// PUT /api/chats/[chatId] - Update chat title
export async function PUT(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    await connectDB();
    
    const { chatId } = params;
    const body = await request.json();
    const { title, userId } = body;

    if (!title || !userId) {
      return NextResponse.json({ error: 'Title and user ID are required' }, { status: 400 });
    }

    const updatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      { title },
      { new: true }
    ).lean();

    if (!updatedChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

// DELETE /api/chats/[chatId] - Delete a chat and all its messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    await connectDB();
    
    const { chatId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete chat
    const deletedChat = await Chat.findOneAndDelete({ _id: chatId, userId });
    
    if (!deletedChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Delete all messages for this chat
    await Message.deleteMany({ chatId });

    return NextResponse.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}
