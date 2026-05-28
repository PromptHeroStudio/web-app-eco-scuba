import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface ProgressChartItem {
  name: string;
  count: number;
}

interface ProjectProgressChartProps {
  data: ProgressChartItem[];
}

const statusColorMap: Record<string, string> = {
  Odobrene: '#2EE6C5',
  'Na odobrenju': '#2F80ED',
  'Za reviziju': '#F59E0B',
  'U pripremi': '#38BDF8',
  'U toku': '#6366F1',
  Generisanje: '#0EA5E9',
  Završeno: '#10B981',
};

export default function ProjectProgressChart({ data }: ProjectProgressChartProps) {
  const hasData = data.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full h-[300px] rounded-2xl bg-white border border-[#D6E6F5] p-6 shadow-[0_8px_24px_rgba(47,128,237,0.08)]"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-lg font-semibold text-text-primary">Napredak sekcija</h3>
          <p className="text-xs text-text-dim">Podaci iz stvarne baze za sve vaše aktivne projekte.</p>
        </div>
        <div className="text-xs text-text-dim">Status sekcija</div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="" stroke="#D6E6F5" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#102C4F', fontSize: 12 }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#102C4F', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid rgba(214,230,245,0.6)',
                borderRadius: '12px',
                color: '#102C4F',
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 8, 8]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={statusColorMap[entry.name] ?? '#2F80ED'}
                  fillOpacity={0.95}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-bg-secondary text-sm text-text-dim">
          Nema dovoljno podataka za prikaz napretka sekcija.
        </div>
      )}
    </motion.div>
  );
}
