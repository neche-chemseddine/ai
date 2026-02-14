import React, { useEffect, useState } from 'react';
import { interviewService } from '../services/interview.service';
import { authService } from '../services/auth.service';
import { 
  Users, 
  Link as LinkIcon, 
  CheckCircle, 
  FileText,
  LogOut,
  Plus,
  LayoutDashboard,
  Settings,
  MoreVertical,
  Upload,
  FileIcon,
  Menu,
  User as UserIcon,
  Search,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Dashboard = () => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const user = authService.getCurrentUser();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const data = await interviewService.getInterviews();
      setInterviews(data);
    } catch (error) {
      console.error('Failed to fetch interviews', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setIsUploadModalOpen(true);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !candidateName.trim()) {
      toast.error('Please provide both a candidate name and a CV file.');
      return;
    }

    setIsUploading(true);
    setIsUploadModalOpen(false);
    
    try {
      await interviewService.uploadCv(selectedFile, candidateName);
      toast.success('CV uploaded and analyzed successfully');
      setCandidateName('');
      setSelectedFile(null);
      fetchInterviews();
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEvaluate = async (id: string) => {
    try {
      await interviewService.evaluate(id);
      toast.success('Evaluation report generated');
      fetchInterviews();
    } catch (error) {
      toast.error('Evaluation failed. Make sure the interview has messages.');
    }
  };

  const copyInvite = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
      default:
        return <Badge variant="outline">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-8 flex items-center space-x-3">
        <div className="bg-primary rounded-xl flex items-center justify-center shadow-lg p-2">
          <LayoutDashboard className="text-primary-foreground" size={20} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground">IntelliView</h1>
      </div>
      <div className="px-4 py-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-4 mb-4">Main Menu</p>
        <nav className="space-y-1">
          <Button variant="secondary" className="w-full justify-start space-x-3">
            <Users size={18} />
            <span className="font-medium">Interviews</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start space-x-3">
            <Calendar size={18} />
            <span className="font-medium">Schedule</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start space-x-3">
            <Settings size={18} />
            <span className="font-medium">Settings</span>
          </Button>
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-sidebar-border space-y-4">
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
          <p className="text-xs font-semibold mb-1">Pro Plan</p>
          <p className="text-[10px] text-muted-foreground mb-3">Get unlimited AI analyses.</p>
          <Button className="w-full font-bold">UPGRADE</Button>
        </div>
        <div className="flex items-center justify-between px-2">
          <ThemeToggle />
          <p className="text-[10px] font-medium text-muted-foreground">v1.0.4</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex font-sans antialiased">
      {/* Desktop Sidebar */}
      <aside className="w-72 border-r border-border flex flex-col hidden lg:flex">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-10 sticky top-0 z-20">
          <div className="flex items-center space-x-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <div className="relative hidden md:block w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input placeholder="Search candidates..." className="pl-10" />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button className="relative">
              <Plus size={18} className="mr-2" />
              New Interview
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange} 
                accept=".pdf" 
              />
            </Button>

            <div className="h-8 w-px bg-border mx-2" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative flex items-center space-x-3 rounded-xl">
                  <Avatar>
                    <AvatarFallback>
                      {user?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold leading-none">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-none mt-1">Recruiter</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mt-2" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Organization</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-6 lg:p-10 overflow-y-auto flex-1 max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div className="space-y-1">
              <h2 className="text-4xl font-bold tracking-tight">Recruitment Pipeline</h2>
              <p className="text-muted-foreground">Monitor and manage your active AI-conducted interviews.</p>
            </div>
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
              <Calendar size={14} />
              <span>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              { label: 'Total Candidates', value: interviews.length, icon: Users, color: 'text-foreground' },
              { label: 'Active Sessions', value: interviews.filter(i => i.status === 'active').length, icon: ArrowUpRight, color: 'text-blue-500' },
              { label: 'Hiring Completed', value: interviews.filter(i => i.status === 'completed').length, icon: CheckCircle, color: 'text-green-500' }
            ].map((stat, i) => (
              <Card key={i} variant="outline">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</CardTitle>
                  <stat.icon size={16} className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Interviews Table */}
          <Card variant="outline" className="overflow-hidden">
            <CardHeader className="px-6 py-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Interview Sessions</CardTitle>
                  <CardDescription>A detailed list of all candidate assessments.</CardDescription>
                </div>
                <Button variant="outline">Export Data</Button>
              </div>
            </CardHeader>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="px-6 h-12">Candidate</TableHead>
                  <TableHead className="h-12">Status</TableHead>
                  <TableHead className="h-12">Date Created</TableHead>
                  <TableHead className="text-right px-6 h-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                        <span className="text-sm font-medium text-muted-foreground">Syncing data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : interviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                      No interviews found. Upload a candidate's CV to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  interviews.map((interview: any) => (
                    <TableRow key={interview.id}>
                      <TableCell className="px-6">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {interview.candidate_name.split(' ').map((n:any) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-sm">{interview.candidate_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter opacity-50">{interview.id.substring(0, 12)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(interview.status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-medium">
                        {new Date(interview.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end space-x-1">
                          {interview.access_token && (
                            <Button 
                              variant="ghost" 
                              onClick={() => copyInvite(`${window.location.origin}/interview/${interview.access_token}`)}
                              title="Copy Invite Link"
                            >
                              <LinkIcon size={16} />
                            </Button>
                          )}
                          {interview.report_url && (
                            <Button variant="ghost" asChild>
                              <a 
                                href={interviewService.getReportUrl(interview.report_url)}
                                target="_blank"
                                rel="noreferrer"
                                title="Download Report"
                              >
                                <FileText size={16} />
                              </a>
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>Management</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {interview.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => handleEvaluate(interview.id)} className="cursor-pointer">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  <span>Complete & Evaluate</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Delete Record</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>

      {/* Mobile Floating Action Button */}
      <div className="lg:hidden fixed bottom-8 right-8 z-30">
        <Button className="relative">
          <Plus size={28} />
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            onChange={handleFileChange} 
            accept=".pdf" 
          />
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
          <div className="bg-primary px-8 py-10 text-primary-foreground relative">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle>New Assessment</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">
                Initialize a new AI-powered technical interview.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Candidate Name</Label>
              <Input
                id="name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Alexander Pierce"
                autoFocus
              />
            </div>
            {selectedFile && (
              <div className="flex items-center p-4 rounded-xl border">
                <FileIcon className="h-5 w-5 mr-4" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tighter font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => {
                setIsUploadModalOpen(false);
                setCandidateName('');
                setSelectedFile(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleConfirmUpload} disabled={!candidateName.trim()} className="flex-[2]">
                Initialize Interview
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-500">
          <div className="flex flex-col items-center space-y-6 max-w-xs px-6 text-center">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold">AI Orchestration</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Analyzing technical requirements and mapping the interview architecture...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
