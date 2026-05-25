import { useEffect, useRef, useState } from 'react';
import type { Message } from '../../types';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Send } from 'lucide-react';

interface Props {
  roomId: string;
  otherUser: { username: string; avatar: string };
}

export function Chat({ roomId, otherUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    api.get<Message[]>(`/messages/${roomId}`).then(({ data }) => setMessages(data));

    const socket = getSocket();
    socket.emit('join_room', roomId);

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user_typing', () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const send = () => {
    if (!input.trim()) return;
    getSocket().emit('send_message', { roomId, content: input.trim() });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    getSocket().emit('typing', roomId);
  };

  return (
    <div className="flex flex-col absolute inset-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && (
                <img src={msg.senderAvatar} className="h-7 w-7 rounded-full object-cover flex-shrink-0" alt="" />
              )}
              <div
                className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${isMe
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2">
            <img src={otherUser.avatar} className="h-7 w-7 rounded-full object-cover" alt="" />
            <div className="px-4 py-2.5 bg-gray-100 rounded-2xl rounded-bl-sm flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2 items-center bg-white sticky bottom-0">
        <input
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje..."
          className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm outline-none
            focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="h-10 w-10 rounded-full bg-brand-gradient text-white flex items-center justify-center
            hover:opacity-90 disabled:opacity-40 transition"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
