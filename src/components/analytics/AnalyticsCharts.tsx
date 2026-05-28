import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsChartsDatum {
  name: string;
  value: number;
  color: string;
}

interface DailyApprovalDatum {
  day: number;
  approved: number;
}

interface AnalyticsChartsProps {
  projectStatusData: AnalyticsChartsDatum[];
  sectionPieData: AnalyticsChartsDatum[];
  activityData: DailyApprovalDatum[];
}

export default function AnalyticsCharts({
  projectStatusData,
  sectionPieData,
  activityData,
}: AnalyticsChartsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-bg-secondary rounded-2xl border border-border shadow-[0_12px_32px_rgba(47,128,237,0.08)]">
          <h3 className="text-lg font-bold mb-6">Sekcije: odobreno vs na čekanju</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {sectionPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {sectionPieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-bg-secondary rounded-2xl border border-border shadow-[0_12px_32px_rgba(47,128,237,0.08)]">
          <h3 className="text-lg font-bold mb-6">Status projekata</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectStatusData} margin={{ left: -12, right: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {projectStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-bg-secondary rounded-2xl border border-border shadow-[0_12px_32px_rgba(47,128,237,0.08)]">
        <h3 className="text-lg font-bold mb-6">Aktivnost odobravanja (zadnjih 30 dana)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C2FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00C2FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Area
                type="monotone"
                dataKey="approved"
                stroke="#2F80ED"
                fillOpacity={1}
                fill="url(#colorApproved)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
