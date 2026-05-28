import { motion } from 'framer-motion';

export default function OceanBubbles() {
  const bubbles = [
    { size: 220, left: '5%', top: '10%', delay: 0 },
    { size: 160, left: '70%', top: '5%', delay: 3 },
    { size: 300, left: '40%', top: '55%', delay: 6 },
    { size: 120, left: '85%', top: '40%', delay: 9 },
  ];

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.08, y: 0 }}
          animate={{ opacity: [0.06, 0.12, 0.06], y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 18 + i * 6, delay: b.delay, ease: 'easeInOut' }}
          style={{ left: b.left, top: b.top, width: b.size, height: b.size }}
          className="absolute rounded-full bg-gradient-to-br from-[rgba(47,128,237,0.06)] to-[rgba(0,194,255,0.04)] blur-3xl"
        />
      ))}
    </div>
  );
}
