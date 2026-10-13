'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';
import { Timer } from 'lucide-react';
import { tokens } from '@/lib/theme';

interface AssessmentTimerProps {
  sectionLabel: string;
  timeLimitSeconds: number;
  /** When true, timer is counting; when false, paused */
  running: boolean;
  /** Reset token — change this value to restart the timer */
  resetKey: string | number;
  onElapsedChange?: (elapsed: number) => void;
}

export default function AssessmentTimer({
  sectionLabel,
  timeLimitSeconds,
  running,
  resetKey,
  onElapsedChange,
}: AssessmentTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Single effect: reset elapsed on section change, manage interval on running/section change.
  // Using a ref for the interval so we can cancel it synchronously inside the effect.
  useEffect(() => {
    // Clear any running interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Reset elapsed whenever section changes (resetKey changes)
    setElapsed(0);
    if (onElapsedChange) onElapsedChange(0);
    // Start counting only if running
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]); // intentionally excludes 'running' — see pause/resume effect below

  // Separate effect: pause/resume WITHOUT resetting elapsed
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]); // only fires on pause/resume, not on section change

  // Sync elapsed time to parent safely outside of render cycle
  useEffect(() => {
    if (onElapsedChange) {
      onElapsedChange(elapsed);
    }
  }, [elapsed, onElapsedChange]);

  const remaining = Math.max(0, timeLimitSeconds - elapsed);
  const progress = Math.min(100, (elapsed / timeLimitSeconds) * 100);
  const isOvertime = elapsed > timeLimitSeconds;

  const fmt = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const color = isOvertime
    ? tokens.colors.status.danger
    : progress > 80
    ? tokens.colors.status.warning
    : tokens.colors.status.success;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Timer size={18} color={color} />
        <Typography
          variant="h6"
          sx={{
            color: tokens.colors.text.primary,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: { xs: '0.8125rem', sm: '0.875rem' },
          }}
        >
          {sectionLabel}
        </Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.375rem',
              color,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
            }}
          >
            {isOvertime ? `+${fmt(elapsed - timeLimitSeconds)}` : fmt(remaining)}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
            {isOvertime ? 'Overtime' : 'sisa waktu'}
          </Typography>
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: tokens.colors.borderLight,
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            borderRadius: 3,
          },
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
          Elapsed: {fmt(elapsed)}
        </Typography>
        <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
          Limit: {fmt(timeLimitSeconds)}
        </Typography>
      </Box>
    </Paper>
  );
}
