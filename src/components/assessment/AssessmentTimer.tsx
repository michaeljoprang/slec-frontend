'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';
import { Timer } from 'lucide-react';
import { tokens } from '@/lib/themeTokens';
import InlineTimerEditor from './InlineTimerEditor';

interface AssessmentTimerProps {
  sectionLabel: string;
  timeLimitSeconds: number;
  maxTimeLimitSeconds?: number;
  /** When true, timer is counting; when false, paused */
  running: boolean;
  /** Reset token — change this value to restart the timer */
  resetKey: string | number;
  onElapsedChange?: (elapsed: number) => void;
  /** Callback when user saves new total duration via inline edit */
  onSaveDuration?: (newTotal: number) => Promise<void> | void;
  /** ID of assessment for automatic PATCH persistence */
  assessmentId?: string;
  /** When true, timer is locked in read-only / frozen mode (only when finishedAt is not null and finalized) */
  isFrozen?: boolean;
  /** Explicitly allow editing timer duration with pencil button */
  allowEdit?: boolean;
  /** Finished timestamp — if null or undefined, timer MUST NOT be frozen */
  finishedAt?: string | null;
  /** Assessment status — if DRAFT or IN_PROGRESS, timer MUST NOT be frozen */
  status?: string | null;
  /** Initial elapsed seconds from DB */
  initialSeconds?: number;
  sx?: any;
}

export default function AssessmentTimer({
  sectionLabel,
  timeLimitSeconds,
  maxTimeLimitSeconds,
  running,
  resetKey,
  onElapsedChange,
  onSaveDuration,
  assessmentId,
  isFrozen,
  allowEdit,
  finishedAt,
  status,
  initialSeconds = 0,
  sx,
}: AssessmentTimerProps) {
  // Audit Integrity frozen mode is strictly allowed ONLY when status is final (COMPLETED / PASS / FAIL / DISQUALIFIED) AND finishedAt is present.
  const isFinalStatus = status ? ['COMPLETED', 'PASS', 'FAIL', 'DISQUALIFIED'].includes(status.toUpperCase()) : false;
  const isDraftOrInProgress = status ? ['DRAFT', 'IN_PROGRESS'].includes(status.toUpperCase()) : false;
  const isReallyFrozen = Boolean(isFrozen && finishedAt != null && isFinalStatus && !isDraftOrInProgress);
  const canEdit = Boolean(allowEdit || isReallyFrozen || onSaveDuration);

  const [elapsed, setElapsed] = useState(initialSeconds || 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync elapsed if initialSeconds prop updates from parent
  useEffect(() => {
    setElapsed(initialSeconds || 0);
  }, [initialSeconds]);

  // When resetKey changes, reset to initialSeconds (or 0)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const startSec = initialSeconds || 0;
    setElapsed(startSec);
    if (onElapsedChange) onElapsedChange(startSec);

    // If not frozen and running, start real-time stopwatch
    if (running && !isReallyFrozen) {
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
  }, [resetKey, isReallyFrozen]);

  // Separate effect: pause/resume WITHOUT resetting elapsed
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (running && !isReallyFrozen) {
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
  }, [running, isReallyFrozen]);

  // Sync elapsed time to parent safely outside of render cycle
  useEffect(() => {
    if (onElapsedChange) {
      onElapsedChange(elapsed);
    }
  }, [elapsed, onElapsedChange]);

  const remaining = Math.max(0, timeLimitSeconds - elapsed);
  const totalBase = maxTimeLimitSeconds || timeLimitSeconds;
  const progress = Math.min(100, (elapsed / totalBase) * 100);
  const isOvertime = elapsed > timeLimitSeconds;
  const isMaxOvertime = maxTimeLimitSeconds ? elapsed > maxTimeLimitSeconds : false;

  const fmt = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const color = isMaxOvertime
    ? tokens.colors.status.danger
    : isOvertime
    ? tokens.colors.status.warning
    : progress > 80
    ? tokens.colors.status.warning
    : tokens.colors.status.success;

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 0, width: '100%', ...sx }}>
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
            {isMaxOvertime ? 'Diskualifikasi (>15m)' : isOvertime ? 'Overtime' : 'sisa waktu'}
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, alignItems: 'center' }}>
        {canEdit ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
              Elapsed:
            </Typography>
            <InlineTimerEditor
              initialSeconds={elapsed}
              timeLimitSeconds={timeLimitSeconds}
              showStatusBadge={false}
              onSave={async (newTotal) => {
                if (onSaveDuration) {
                  await onSaveDuration(newTotal);
                } else if (assessmentId) {
                  const res = await fetch(`/api/assessments/${assessmentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ durationSeconds: newTotal }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Gagal menyimpan durasi ke database');
                  }
                }
                setElapsed(newTotal);
                if (onElapsedChange) onElapsedChange(newTotal);
              }}
            />
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
            Elapsed: {fmt(elapsed)}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
          {maxTimeLimitSeconds
            ? `Standar: ${fmt(timeLimitSeconds)} · Maks: ${fmt(maxTimeLimitSeconds)}`
            : `Limit: ${fmt(timeLimitSeconds)}`}
        </Typography>
      </Box>
    </Paper>
  );
}
