import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewService } from '../services/interview.service';
import { io, Socket } from 'socket.io-client';
import { Send, Bot, AlertCircle, Info, ChevronLeft, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

const CandidateInterview = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
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
        
        if (data.status === 'completed') {
          setIsSessionCompleted(true);
        }

        if (data.messages) {
          setMessages(data.messages.map((m: any) => ({
            role: m.role,
            text: m.content
          })));
        }

        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
        socketRef.current = io(socketUrl);

        socketRef.current.on('interviewer_message', (data) => {
          setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
          setIsTyping(false);
        });

        socketRef.current.on('interviewer_typing', (data) => {
          setIsTyping(data.typing);
        });

        socketRef.current.on('session_completed', () => {
          setIsSessionCompleted(true);
          setIsGeneratingReport(true);
        });

        socketRef.current.on('report_ready', () => {
          setIsGeneratingReport(false);
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
    if (!inputText.trim() || !socketRef.current || !interview || isSessionCompleted) return;

    const text = inputText.trim();
    setInputText('');

    setMessages(prev => [...prev, { role: 'user', text }]);

    socketRef.current.emit('candidate_message', {
      interviewId: interview.id,
      text: text
    });
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="relative size-16">
          <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Authenticating session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-background flex items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4 text-destructive">
              <AlertCircle size={32} />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
              <ChevronLeft className="mr-2 size-4" />
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden font-sans antialiased">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border h-20 flex flex-shrink-0 z-20">
        <div className="max-w-5xl mx-auto w-full px-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-primary-foreground">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Technical Assessment</h1>
              <div className="flex items-center space-x-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Candidate: {interview?.candidate_name}</p>
                <Badge variant="secondary">LIVE</Badge>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative bg-muted/30">
        <ScrollArea className="flex-1 px-4 py-8 md:px-6">
          <div className="max-w-4xl mx-auto space-y-10 pb-10">
            {messages.length === 0 && !isSessionCompleted && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="bg-card size-20 rounded-3xl flex items-center justify-center shadow-xl mb-6 border">
                  <Bot size={40} />
                </div>
                <h3 className="text-xl font-bold">Welcome to your interview</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-[300px]">
                  The AI interviewer is ready. Send a message whenever you're prepared to begin.
                </p>
                <Button className="mt-8" onClick={() => {
                  setInputText('Hello! I am ready to start the interview.');
                }}>
                  Start Conversation
                </Button>
              </div>
            )}

            {isSessionCompleted && messages.length > 0 && (
              <div className="flex justify-center mb-8 animate-in zoom-in duration-500">
                <Card className="w-full max-w-md border-none shadow-lg bg-primary text-primary-foreground">
                  <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-2">
                      <div className="bg-white/20 p-2 rounded-full">
                        {isGeneratingReport ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />}
                      </div>
                    </div>
                    <CardTitle className="text-xl">Session Concluded</CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      {isGeneratingReport 
                        ? "Please wait while our AI finalizes your technical assessment report..." 
                        : "Your interview is complete. The recruiter has been notified."}
                    </CardDescription>
                  </CardHeader>
                  {!isGeneratingReport && (
                    <CardContent className="text-center pt-2">
                      <p className="text-xs font-medium opacity-70">You can now close this window.</p>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`flex max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
                  <Avatar className={msg.role === 'user' ? 'ml-3' : 'mr-3'}>
                    <AvatarFallback>{msg.role === 'user' ? 'ME' : 'AI'}</AvatarFallback>
                  </Avatar>
                  <div className={`px-5 py-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-br-none' 
                      : 'bg-card text-card-foreground border rounded-bl-none'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start items-end">
                <Avatar className="mr-3">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="bg-card border px-5 py-4 rounded-2xl rounded-bl-none flex space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </main>

      {/* Input Area */}
      <footer className="bg-background border-t border-border p-6 md:p-10 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSend} className="relative">
            <Input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isSessionCompleted ? "Interview session closed" : "Type your response here..."}
              className="h-16 pr-20"
              disabled={isSessionCompleted}
            />
            <Button 
              type="submit"
              disabled={!inputText.trim() || isSessionCompleted}
              className="absolute right-2 top-2 h-12 w-12"
            >
              <Send size={20} />
            </Button>
          </form>
          <div className="flex justify-between items-center mt-4 px-2 opacity-50">
            <p className="text-[9px] font-bold uppercase tracking-widest">Secured Session</p>
            <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
              <Info size={10} /> Shift + Enter for new line
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CandidateInterview;
