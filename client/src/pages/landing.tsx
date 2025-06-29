import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, BarChart3, Users, Zap } from "lucide-react";

export default function Landing() {
  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">TaskMasterPro</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-6">
            Professional Task
            <span className="text-primary block">Management</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Streamline your workflow, collaborate with your team, and boost productivity with our comprehensive task management solution.
          </p>

          {/* Login Card */}
          <Card className="max-w-md mx-auto mb-16 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Get Started</h2>
                <p className="text-slate-600">Sign in to access your dashboard</p>
              </div>
              
              <Button 
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-gray-50 text-slate-700 border-2 border-gray-200 hover:border-gray-300 shadow-sm"
                size="lg"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
              
              <p className="text-sm text-slate-500 mt-4 text-center">
                By continuing, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Task Management</h3>
              <p className="text-slate-600">Create, organize, and track tasks with powerful filtering and sorting options.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Team Collaboration</h3>
              <p className="text-slate-600">Share tasks with team members and collaborate in real-time.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Analytics & Insights</h3>
              <p className="text-slate-600">Track productivity and get insights into your team's performance.</p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Powerful Features</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <Zap className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-800">Real-time Updates</h4>
                  <p className="text-slate-600 text-sm">See changes instantly across all devices with WebSocket integration.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-800">Priority Management</h4>
                  <p className="text-slate-600 text-sm">Organize tasks by priority levels and never miss important deadlines.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-800">Email Sharing</h4>
                  <p className="text-slate-600 text-sm">Invite team members via email and set permission levels.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <BarChart3 className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-800">Productivity Tracking</h4>
                  <p className="text-slate-600 text-sm">Visualize your progress with detailed charts and statistics.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
