import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewService } from '../services/interview.service';
import { 
  ChevronLeft, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Code2, 
  MessageSquare, 
  BrainCircuit, 
  Layout,
  Trophy,
  History,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const InterviewReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchInterview();
    }
  }, [id]);

  const fetchInterview = async () => {
    try {
      const data = await interviewService.getInterview(id!);
      setInterview(data);
    } catch (error) {
      console.error('Failed to fetch interview', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center">Loading evaluation...</div>;
  if (!interview) return <div className="p-20 text-center">Interview not found.</div>;

  const evaluation = interview.rubric?.evaluation || {};

  return (
    <div className="min-h-screen bg-muted/30 pb-20 font-sans antialiased">
      {/* Top Bar */}
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ChevronLeft className="mr-1 size-4" />
              Back to Dashboard
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <h1 className="font-bold">{interview.candidate_name}</h1>
              <Badge variant="outline" className="text-[10px] uppercase tracking-tighter">
                ID: {interview.id.substring(0, 8)}
              </Badge>
            </div>
          </div>
          <Button size="sm" asChild>
            <a href={interviewService.getReportUrl(interview.report_url)} target="_blank" rel="noreferrer">
              <Download className="mr-2 size-4" />
              Download PDF Report
            </a>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Summary & Scores */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <div className={`h-2 ${evaluation.technical_score >= 7 ? 'bg-green-500' : 'bg-amber-500'}`} />
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Overall Verdict
                {evaluation.technical_score >= 7 ? 
                  <Badge className="bg-green-500 hover:bg-green-600">HIRE</Badge> : 
                  <Badge variant="secondary">NO HIRE</Badge>
                }
              </CardTitle>
              <CardDescription>Based on multi-stage technical assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Technical', val: evaluation.technical_score },
                  { label: 'Communication', val: evaluation.communication_score },
                  { label: 'Problem Solving', val: evaluation.problem_solving_score },
                  { label: 'Match', val: evaluation.experience_match_score }
                ].map((s, i) => (
                  <div key={i} className="bg-muted/50 p-3 rounded-xl border border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="text-xl font-bold">{s.val}/10</p>
                  </div>
                ))}
              </div>
              
              <div>
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  Auditor Notes
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "{evaluation.auditor_notes}"
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-bold">Key Strengths</h4>
                {evaluation.strengths?.map((s: string, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold">Critical Weaknesses</h4>
                {evaluation.weaknesses?.map((w: string, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <XCircle className="size-4 text-destructive shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detailed Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-12 bg-background border p-1 rounded-xl">
              <TabsTrigger value="transcript" className="rounded-lg gap-2">
                <History className="size-4" />
                Transcript
              </TabsTrigger>
              <TabsTrigger value="quiz" className="rounded-lg gap-2">
                <BrainCircuit className="size-4" />
                Quiz
              </TabsTrigger>
              <TabsTrigger value="code" className="rounded-lg gap-2">
                <Code2 className="size-4" />
                Code
              </TabsTrigger>
              <TabsTrigger value="summary" className="rounded-lg gap-2">
                <Layout className="size-4" />
                Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="mt-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="size-5 text-primary" />
                    Interview Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-8">
                      {interview.messages?.map((msg: any, i: number) => (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={msg.role === 'user' ? 'outline' : 'default'} className="text-[10px] uppercase">
                              {msg.role === 'user' ? 'Candidate' : 'AI Interviewer'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className={`text-sm leading-relaxed p-4 rounded-xl ${msg.role === 'user' ? 'bg-muted/30 border' : 'bg-primary/5 border border-primary/10'}`}>
                            {msg.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiz" className="mt-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="size-5 text-primary" />
                    Knowledge Sprint Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {interview.quiz_results?.quiz?.map((q: any, i: number) => {
                    const candidateAnswer = interview.quiz_results.attempts?.[i];
                    const isCorrect = candidateAnswer === q.correct_answer;
                    return (
                      <div key={i} className="p-4 rounded-xl border space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <h5 className="text-sm font-bold">{i+1}. {q.question}</h5>
                          {isCorrect ? 
                            <Badge className="bg-green-500">Correct</Badge> : 
                            <Badge variant="destructive">Incorrect</Badge>
                          }
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {q.options.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className={`text-xs p-2 rounded-lg border ${
                              optIdx === q.correct_answer ? 'bg-green-500/10 border-green-500/50 text-green-700' :
                              optIdx === candidateAnswer ? 'bg-destructive/10 border-destructive/50 text-destructive' : 'bg-muted/50'
                            }`}>
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground bg-muted p-2 rounded-md italic">
                          <strong>Note:</strong> {q.explanation}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="code" className="mt-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code2 className="size-5 text-primary" />
                    Coding Arena Submission
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-xl border">
                    <h5 className="text-sm font-bold mb-2">{interview.coding_results?.challenge?.title}</h5>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {interview.coding_results?.challenge?.problem_statement}
                    </p>
                  </div>
                  
                  <div className="bg-[#1e1e1e] p-6 rounded-xl overflow-x-auto border-4 border-muted">
                    <pre className="text-green-400 font-mono text-xs leading-relaxed">
                      <code>{interview.coding_solution || "# No code submitted"}</code>
                    </pre>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-xl border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Layout className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Execution Status</p>
                        <p className="text-sm font-medium">Test Cases Passed: {interview.coding_results?.execution_results?.test_passed || 0}/{interview.coding_results?.execution_results?.total_tests || 0}</p>
                      </div>
                    </div>
                    <Badge variant="outline">STABLE</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="mt-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Final Recommendation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                    <p className="text-sm leading-relaxed text-foreground">
                      {evaluation.summary}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-bold mb-4">Proven Technical Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {evaluation.proven_skills?.map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default InterviewReview;
