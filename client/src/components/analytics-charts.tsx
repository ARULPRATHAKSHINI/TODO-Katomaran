import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

interface AnalyticsChartsProps {
  data: { date: string; completed: number; created: number }[];
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // Transform data for better display
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    completed: item.completed,
    created: item.created,
    productivity: item.created > 0 ? Math.round((item.completed / item.created) * 100) : 0
  }));

  if (!data || data.length === 0) {
    return (
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No productivity data</p>
          <p className="text-sm text-slate-400">Complete some tasks to see your productivity chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Line Chart for Task Completion */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Task Completion Trend</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="completed" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              name="Completed Tasks"
            />
            <Line 
              type="monotone" 
              dataKey="created" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              name="Created Tasks"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart for Daily Productivity */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Daily Productivity Rate</h4>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: any) => [`${value}%`, 'Completion Rate']}
            />
            <Bar 
              dataKey="productivity" 
              fill="#f59e0b" 
              radius={[4, 4, 0, 0]}
              name="Completion Rate"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {chartData.reduce((sum, day) => sum + day.completed, 0)}
          </p>
          <p className="text-xs text-slate-500">Total Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {chartData.reduce((sum, day) => sum + day.created, 0)}
          </p>
          <p className="text-xs text-slate-500">Total Created</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-600">
            {chartData.length > 0 
              ? Math.round(chartData.reduce((sum, day) => sum + day.productivity, 0) / chartData.length)
              : 0}%
          </p>
          <p className="text-xs text-slate-500">Avg. Completion</p>
        </div>
      </div>
    </div>
  );
}
