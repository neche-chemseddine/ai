import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewService } from '../services/interview.service';
import { io, Socket } from 'socket.io-client';
import { Send, Bot, AlertCircle, ChevronLeft, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

const QuizStage = ({ quiz, onComplete, token }: { quiz: any[], onComplete: (results: any) => void, token: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionSelect = (optionIndex: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentIndex]: optionIndex });
  };

  const handleNext = async () => {
    if (currentIndex < quiz.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsSubmitting(true);
      await interviewService.submitQuiz(token, selectedAnswers);
      onComplete(selectedAnswers);
    }
  };

  const currentQuestion = quiz[currentIndex];

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in zoom-in duration-500">
      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl">
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
              Question {currentIndex + 1} of {quiz.length}
            </Badge>
            <div className="flex gap-1">
              {quiz.map((_, i) => (
                <div key={i} className={`h-1 w-6 rounded-full transition-all duration-300 ${i <= currentIndex ? 'bg-primary' : 'bg-primary/10'}`} />
              ))}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold leading-tight">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3">
            {currentQuestion.options.map((option: string, idx: number) => (
              <Button
                key={idx}
                variant={selectedAnswers[currentIndex] === idx ? "default" : "outline"}
                className={`h-auto py-6 px-6 justify-start text-left text-base font-medium transition-all duration-200 hover:scale-[1.01] ${
                  selectedAnswers[currentIndex] === idx ? 'ring-2 ring-primary ring-offset-2' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleOptionSelect(idx)}
              >
                <div className="flex items-center gap-4">
                  <div className={`size-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    selectedAnswers[currentIndex] === idx ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  {option}
                </div>
              </Button>
            ))}
          </div>
          <Button 
            className="w-full h-14 text-lg font-bold mt-4 shadow-lg shadow-primary/20" 
            disabled={selectedAnswers[currentIndex] === undefined || isSubmitting}
            onClick={handleNext}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : (currentIndex < quiz.length - 1 ? "Next Question" : "Complete Knowledge Sprint")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const CodingStage = ({ challenge, onComplete, token }: { challenge: any, onComplete: (solution: string) => void, token: string }) => {
  const [solution, setSolution] = useState(challenge.template || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // In a real version, we'd run tests here. For now, we just submit.
    await interviewService.submitCoding(token, solution, { status: 'submitted' });
    onComplete(solution);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-background overflow-hidden animate-in fade-in slide-in-from-right-10 duration-700">
      {/* Problem Panel */}
      <div className="w-full md:w-1/3 border-r p-8 overflow-y-auto bg-muted/20">
        <Badge className="mb-4">STAGE 2: CODING ARENA</Badge>
        <h2 className="text-2xl font-bold mb-6">{challenge.title}</h2>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {challenge.problem_statement}
          </p>
        </div>
      </div>

      {/* IDE Panel */}
      <div className="flex-1 flex flex-col relative">
        <div className="bg-muted/50 px-6 py-3 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-destructive/50" />
            <div className="size-3 rounded-full bg-warning/50" />
            <div className="size-3 rounded-full bg-success/50" />
            <span className="ml-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Python Editor</span>
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin mr-2 size-4" /> : <Sparkles className="mr-2 size-4" />}
            Submit Solution
          </Button>
        </div>
        <textarea
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          className="flex-1 bg-black/5 text-foreground p-8 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 leading-relaxed"
          spellCheck={false}
        />
        <div className="absolute bottom-6 right-8">
          <div className="bg-primary/5 border border-primary/20 backdrop-blur-md px-4 py-2 rounded-lg text-[10px] font-bold text-primary uppercase tracking-widest">
            Auto-saving Enabled
          </div>
        </div>
      </div>
    </div>
  );
};

const CandidateInterview = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('init'); // init, quiz, coding, chat, completed
  const [quiz, setQuiz] = useState<any[]>([]);
  const [challenge, setChallenge] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
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
        setCurrentStage(data.current_stage || 'init');
        
        if (data.current_stage === 'quiz') {
          const quizData = await interviewService.getQuiz(token);
          setQuiz(quizData);
        } else if (data.current_stage === 'coding') {
          const challengeData = await interviewService.getCoding(token);
          setChallenge(challengeData);
        }

        if (data.status === 'completed' || (data.messages && data.messages.length > 0)) {
          setHasStarted(true);
        }

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
        const socket = io(socketUrl);
        socketRef.current = socket;

        socket.on('interviewer_message', (data) => {
          setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
          setIsTyping(false);
        });

        socket.on('interviewer_typing', (data) => {
          setIsTyping(data.typing);
        });

        socket.on('session_completed', () => {
          setIsSessionCompleted(true);
          setIsGeneratingReport(true);
        });

        socket.on('report_ready', () => {
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

  const handleStartInterview = async () => {
    if (!token) return;
    setHasStarted(true);
    await interviewService.updateStage(token, 'quiz');
    const quizData = await interviewService.getQuiz(token);
    setQuiz(quizData);
    setCurrentStage('quiz');
  };

  const handleQuizComplete = async () => {
    if (!token) return;
    await interviewService.updateStage(token, 'coding');
    const challengeData = await interviewService.getCoding(token);
    setChallenge(challengeData);
    setCurrentStage('coding');
  };

  const handleCodingComplete = async () => {
    if (!token || !socketRef.current || !interview) return;
    await interviewService.updateStage(token, 'chat');
    setCurrentStage('chat');
    socketRef.current.emit('start_interview', { interviewId: interview.id });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current || !interview || isSessionCompleted || !hasStarted) return;

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
                <Badge variant="secondary" className="uppercase tracking-widest px-2 py-0 text-[9px]">{currentStage === 'chat' ? 'Live Chat' : currentStage}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">Assessment Progress</p>
              <div className="flex gap-1.5">
                {['init', 'quiz', 'coding', 'chat'].map((s) => (
                  <div key={s} className={`h-1 w-8 rounded-full transition-colors duration-500 ${
                    s === currentStage ? 'bg-primary' : 
                    ['init', 'quiz', 'coding', 'chat'].indexOf(s) < ['init', 'quiz', 'coding', 'chat'].indexOf(currentStage) ? 'bg-primary/40' : 'bg-muted'
                  }`} />
                ))}
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentStage === 'init' && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/20">
            <div className="bg-card size-24 rounded-[2rem] flex items-center justify-center shadow-2xl mb-8 border animate-in zoom-in duration-700">
              <Bot size={48} className="text-primary" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">Welcome, {interview?.candidate_name}</h2>
            <p className="text-muted-foreground max-w-md mb-10 leading-relaxed">
              This is a 3-stage technical assessment. You'll start with a Knowledge Sprint, 
              move to the Coding Arena, and finish with a Code Defense session with our AI.
            </p>
            <Button size="lg" className="h-16 px-10 text-lg font-bold shadow-xl shadow-primary/20 rounded-2xl" onClick={handleStartInterview}>
              Begin Assessment
            </Button>
          </div>
        )}

        {currentStage === 'quiz' && quiz.length > 0 && (
          <QuizStage quiz={quiz} token={token!} onComplete={handleQuizComplete} />
        )}

        {currentStage === 'coding' && challenge && (
          <CodingStage challenge={challenge} token={token!} onComplete={handleCodingComplete} />
        )}

        {currentStage === 'chat' && (
          <main className="h-full flex flex-col relative bg-muted/30">
            <ScrollArea className="flex-1 px-4 py-8 md:px-6">
              <div className="max-w-4xl mx-auto space-y-10 pb-10">
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

            {/* Input Area */}
            <footer className="bg-background border-t border-border p-6 md:p-10 flex-shrink-0">
              <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSend} className="relative">
                  <Input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isSessionCompleted ? "Interview session closed" : "Defend your code..."}
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
              </div>
            </footer>
          </main>
        )}
      </div>
    </div>
  );
};

export default CandidateInterview;
