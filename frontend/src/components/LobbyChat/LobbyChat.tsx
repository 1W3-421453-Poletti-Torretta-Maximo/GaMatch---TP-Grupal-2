import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useLobbyStore } from '../../store/lobbyStore';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../lib/socket';

interface Props {
  lobbyId: string;
}

export function LobbyChat({ lobbyId }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { messages, typingUsers, fetchMessages, sendMessage, addMessage, joinLobby, leaveLobby, setTypingUsers } = useLobbyStore();
  const { user } = useAuthStore();

  useEffect(() => {
    joinLobby(lobbyId);
    fetchMessages(lobbyId);

    const socket = getSocket();
    const handler = (msg: any) => addMessage(msg);
    socket.on('new_lobby_message', handler);

    const typingHandler = (data: { userId: string }) => {
      if (data.userId !== user?.id) {
        setTypingUsers([data.userId]);
        clearTimeout(typingTimeout.current!);
        typingTimeout.current = setTimeout(() => setTypingUsers([]), 2000);
      }
    };
    socket.on('lobby_user_typing', typingHandler);

    return () => {
      leaveLobby(lobbyId);
      socket.off('new_lobby_message', handler);
      socket.off('lobby_user_typing', typingHandler);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [lobbyId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const send = () => {
    if (!input.trim() || !user) return;
    sendMessage(lobbyId, input.trim(), user.username);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    getSocket().emit('lobby_typing', lobbyId);
  };

  return (
    <div className="flex flex-col absolute inset-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div
                className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${isMe
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
              >
                {!isMe && (
                  <p className="text-xs font-semibold text-gray-500 mb-0.5">{msg.senderName}</p>
                )}
                {msg.content}
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="px-4 py-2.5 bg-gray-100 rounded-2xl rounded-bl-sm flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex gap-2 items-center bg-white sticky bottom-0">
        <input
          value={input}
          onChange={handleInputChange}
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
