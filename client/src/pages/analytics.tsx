import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import AnalyticsCharts from "@/components/analytics-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Clock, Users, Target } from "lucide-react";
import type { TaskStats } from "@shared/schema";

export default function Analytics() {
  const { data: stats } = useQuery<TaskStats>({
    queryKey: ["/api/analytics/stats"],
  });

  const { data: productivity } = useQuery<{ date: string; completed: number; created: number }[]>({
    queryKey: ["/api/analytics/productivity", { days: 7 }],
  });

  const { data: teamPerformance } = useQuery<{ user: any; completedTasks: number; totalTasks: number }[]>({
    queryKey: ["/api/analytics/team"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
              <p className="text-slate-600 mt-1">Track your productivity and task completion trends</p>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Productivity Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Weekly Productivity</CardTitle>
                    <Select defaultValue="7">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 3 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {productivity && <AnalyticsCharts data={productivity} />}
                </CardContent>
              </Card>

              {/* Task Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-slate-700">Completed</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-slate-800 w-12">
                            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm text-slate-700">In Progress</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full" 
                              style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-slate-800 w-12">
                            {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                          <span className="text-sm text-slate-700">Pending</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gray-400 h-2 rounded-full" 
                              style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-slate-800 w-12">
                            {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Time Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Time Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">Average Tasks/Day</p>
                          <p className="text-xs text-slate-600">This week</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {productivity ? Math.round(productivity.reduce((acc, day) => acc + day.created, 0) / 7) : 0}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Target className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">Tasks On Time</p>
                          <p className="text-xs text-slate-600">Completed before deadline</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {stats && stats.total > 0 
                          ? Math.round(((stats.total - stats.overdue) / stats.total) * 100) 
                          : 100}%
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="h-8 w-8 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">Most Productive Day</p>
                          <p className="text-xs text-slate-600">This week</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-yellow-600">
                        {productivity && productivity.length > 0
                          ? productivity.reduce((max, day) => day.completed > max.completed ? day : max).date
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamPerformance && teamPerformance.length > 0 ? (
                      teamPerformance.map((member, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={member.user.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user.firstName + ' ' + member.user.lastName)}&background=3B82F6&color=fff`}
                              alt={`${member.user.firstName} ${member.user.lastName}`}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {member.user.firstName} {member.user.lastName}
                              </p>
                              <p className="text-xs text-slate-500">{member.user.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-800">{member.completedTasks} tasks</p>
                            <p className="text-xs text-green-600">
                              {member.totalTasks > 0 
                                ? Math.round((member.completedTasks / member.totalTasks) * 100) 
                                : 0}% completion
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No team data available</p>
                        <p className="text-sm text-slate-400">Share tasks with team members to see performance data</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
