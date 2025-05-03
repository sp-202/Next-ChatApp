// app/chat/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SockJS from 'sockjs-client';
import * as StompJs from '@stomp/stompjs';

let stompClient: StompJs.Client | null = null;

export default function ChatPage() {
  const searchParams = useSearchParams();
  const username = searchParams.get('username');
  const roomId = searchParams.get('roomId');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/get-messages?roomId=${roomId}`);
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };

    fetchMessages();
  }, [roomId]);

  useEffect(() => {
    const socket = new SockJS(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`);

    stompClient = new StompJs.Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      debug: (str) => console.log(str),
    });

    stompClient.onConnect = () => {
      stompClient?.subscribe(`/topic/room/${roomId}`, (message) => {
        const msgBody = JSON.parse(message.body);
        setMessages((prev) => [...prev, msgBody]);
      });
    };

    stompClient.onStompError = (frame) => {
      console.error('Broker error:', frame.headers['message']);
      console.error('Details:', frame.body);
    };

    stompClient.activate();

    return () => {
      stompClient?.deactivate();
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isOwnMessage = (msgUsername: string) => msgUsername === username;
  // console.log(isOwnMessage.toString())

  const handleSendMessage = () => {
    if (newMessage.trim() && stompClient && stompClient.connected) {
      const messagePayload = {
        sender: username,
        roomId,
        message: newMessage,
        timestamp: new Date().toISOString(),
      };

      stompClient.publish({
        destination: `/app/send-message/${roomId}`,
        body: JSON.stringify(messagePayload),
      });

      setNewMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };



  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="bg-indigo-600 text-white py-4 px-6 shadow-md flex justify-between items-center">
        <div className="text-lg font-semibold">Room: {roomId}</div>
        <div className="text-sm">User: {username}</div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        <div className="text-center text-gray-500 my-4">
          👋 Welcome to the chat, {username}! Start messaging in room {roomId}.
        </div>
        {messages
          .map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender===username ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md p-2 rounded-2xl shadow text-sm break-words ${msg.sender===username ? 'bg-indigo-500' : 'bg-indigo-700'} text-white`}>
                <div>{msg.sender}</div>
                <div>{msg.message}</div>
                <div className="text-xs mt-1 text-indigo-200 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 shadow-inner flex gap-2">
        <input
          type="text"
          className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          onClick={handleSendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}