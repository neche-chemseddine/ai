import React, { useState } from 'react';
import { authService } from '../services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { LayoutDashboard } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isRegister) {
        await authService.register({ email, password, name, companyName });
        toast.success('Registration successful! Please login.');
        setIsRegister(false);
      } else {
        await authService.login(email, password);
        window.location.href = '/';
      }
    } catch (error) {
      toast.error('Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="absolute top-8 right-8">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[400px] space-y-8 relative">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-primary rounded-xl flex items-center justify-center mb-2 shadow-lg p-3">
            <LayoutDashboard className="text-primary-foreground" size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">IntelliView AI</h1>
          <p className="text-muted-foreground text-sm">
            The next generation of AI-powered technical interviews.
          </p>
        </div>

        <Card variant="outline">
          <CardHeader>
            <CardTitle>
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isRegister ? 'Enter your details to register your company' : 'Sign in to access your recruiter dashboard'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {isRegister && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name"
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input 
                      id="companyName"
                      type="text" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Inc"
                      required
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isRegister && (
                    <Button variant="link">
                      Forgot password?
                    </Button>
                  )}
                </div>
                <Input 
                  id="password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
              </Button>
              
              <div className="text-sm text-center text-muted-foreground">
                {isRegister ? 'Already have an account?' : 'Need an account?'}
                <Button 
                  variant="link"
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                >
                  {isRegister ? 'Sign in' : 'Register company'}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground/60 uppercase tracking-widest">
          Enterprise Grade Security • Powered by IntelliView AI
        </p>
      </div>
    </div>
  );
};

export default Login;
