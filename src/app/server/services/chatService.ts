export interface Chat {
  _id: string;
  userId: string;
  title: string;
  preview: string;
  messageCount: number;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  chatId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatWithMessages {
  chat: Chat;
  messages: Message[];
}

class ChatService {
  private baseUrl = '/api';

  // Get all chats for a user
  async getChats(userId: string): Promise<Chat[]> {
    const response = await fetch(`${this.baseUrl}/chats?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }
    return response.json();
  }

  // Get a specific chat with messages
  async getChat(chatId: string, userId: string): Promise<ChatWithMessages> {
    const response = await fetch(`${this.baseUrl}/chats/${chatId}?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch chat');
    }
    return response.json();
  }

  // Create a new chat
  async createChat(userId: string, title: string, preview: string, firstMessage: string): Promise<Chat> {
    const response = await fetch(`${this.baseUrl}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title,
        preview,
        firstMessage,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to create chat');
    }
    return response.json();
  }

  // Add a message to a chat
  async addMessage(chatId: string, content: string, role: 'user' | 'assistant', userId: string, timestamp?: Date): Promise<Message> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        content,
        role,
        userId,
        timestamp: timestamp?.toISOString(),
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to add message');
    }
    return response.json();
  }

  // Update chat title
  async updateChatTitle(chatId: string, title: string, userId: string): Promise<Chat> {
    const response = await fetch(`${this.baseUrl}/chats/${chatId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        userId,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update chat');
    }
    return response.json();
  }

  // Delete a chat
  async deleteChat(chatId: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/chats/${chatId}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete chat');
    }
  }
}

export const chatService = new ChatService();
