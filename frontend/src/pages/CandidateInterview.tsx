import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewService } from '../services/interview.service';
import { io, Socket } from 'socket.io-client';
import { Send, User, Bot, AlertCircle, Loader2 } from 'lucide-react';

const CandidateInterview = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!token) return;

    const initInterview = async () => {
      try {
        const data = await interviewService.getSession(token);
        setInterview(data);
        // If there are existing messages, load them
        if (data.messages) {
          setMessages(data.messages.map((m: any) => ({
            role: m.role,
            text: m.content
          })));
        }

        // Initialize Socket
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
        socketRef.current = io(socketUrl);

        socketRef.current.on('interviewer_message', (data) => {
          setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
          setIsTyping(false);
        });

        socketRef.current.on('interviewer_typing', (data) => {
          setIsTyping(data.typing);
        });

        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or expired interview link');
        setLoading(false);
      }
    };

    initInterview();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  useEffect(scrollToBottom, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current || !interview) return;

    const text = inputText.trim();
    setInputText('');

    // Add user message locally
    setMessages(prev => [...prev, { role: 'user', text }]);

    // Send via socket
    socketRef.current.emit('candidate_message', {
      interviewId: interview.id,
      text: text
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="text-primary-600 font-medium hover:underline"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">Technical Interview</h1>
              <p className="text-xs text-gray-500">Candidate: {interview?.candidate_name}</p>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Session Active</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p>The interview hasn't started yet. Send a message to begin.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                  msg.role === 'user' ? 'bg-primary-600 ml-2' : 'bg-gray-300 mr-2'
                }`}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-gray-600" />}
                </div>
                <div className={`p-4 rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start items-center space-x-2 text-gray-400">
              <div className="bg-gray-300 w-8 h-8 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-gray-600" />
              </div>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex space-x-4">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your answer here..."
            className="flex-1 p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          Powered by IntelliView AI • Professional Assessment Session
        </p>
      </footer>
    </div>
  );
};

export default CandidateInterview;
