'use client'
import { motion } from 'framer-motion'

interface Props {
  score: number
  label: string
  processingMs: number
}

function scoreColor(score: number): string {
  if (score >= 76) return '#2DB87A'
  if (score >= 51) return '#A8C23A'
  if (score >= 26) return '#E8993C'
  return '#E85D3C'
}

function scoreGrade(score: number): string {
  if (score >= 76) return 'A'
  if (score >= 51) return 'B'
  if (score >= 26) return 'C'
  return 'F'
}

export default function ScoreGauge({ score, label, processingMs }: Props) {
  const color = scoreColor(score)
  const grade = scoreGrade(score)
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="#2A2A32"
            strokeWidth="10"
          />
          <motion.circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {Math.round(score)}
          </motion.span>
          <span className="text-xs text-delta-muted">/ 100</span>
        </div>
      </div>

      <div className="text-center">
        <div
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ color, backgroundColor: `${color}20` }}
        >
          {label}
        </div>
        <div className="text-xs text-delta-muted mt-1">
          {processingMs}ms
        </div>
      </div>
    </div>
  )
}
