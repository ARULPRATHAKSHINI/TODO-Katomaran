import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, Bell, ChevronDown, LogOut, User, BarChart3 } from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isConnected } = useWebSocket();

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">TaskMasterPro</h1>
          
          <nav className="hidden md:flex items-center space-x-6 ml-8">
            <Link href="/">
              <Button 
                variant={location === "/" ? "default" : "ghost"}
                className={location === "/" ? "bg-blue-50 text-primary hover:bg-blue-100" : ""}
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/analytics">
              <Button 
                variant={location === "/analytics" ? "default" : "ghost"}
                className={location === "/analytics" ? "bg-blue-50 text-primary hover:bg-blue-100" : ""}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Real-time Status Indicator */}
          {isConnected ? (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 font-medium">Live</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs text-red-700 font-medium">Offline</span>
            </div>
          )}
          
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          
          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3">
                <img 
                  src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.firstName || '') + ' ' + (user?.lastName || ''))}&background=3B82F6&color=fff`}
                  alt="User profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-sm font-medium text-slate-700 hidden sm:block">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
