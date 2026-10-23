'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Pencil, Check, X } from 'lucide-react';
import { tokens } from '@/lib/themeTokens';

export interface InlineTimerEditorProps {
  /** Current duration in seconds */
  initialSeconds: number;
  /** Standard time limit in seconds to compare against */
  timeLimitSeconds?: number;
  /** Callback when user saves new total seconds */
  onSave: (newTotalSeconds: number) => Promise<boolean | void> | void;
  /** External saving indicator */
  isSaving?: boolean;
  /** If true, editing is disabled */
  disabled?: boolean;
  /** Optional label */
  label?: string;
  /** Show status badge (Sesuai Standar / Overtime) */
  showStatusBadge?: boolean;
  /** Compact sizing */
  size?: 'small' | 'medium';
  /** Custom sx for wrapper */
  sx?: any;
}

export default function InlineTimerEditor({
  initialSeconds = 0,
  timeLimitSeconds,
  onSave,
  isSaving = false,
  disabled = false,
  showStatusBadge = true,
  size = 'small',
  sx,
}: InlineTimerEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);

  const initialMinutes = Math.floor(initialSeconds / 60);
  const initialRemSeconds = initialSeconds % 60;

  const [minutesStr, setMinutesStr] = useState<string>(String(initialMinutes));
  const [secondsStr, setSecondsStr] = useState<string>(String(initialRemSeconds));

  const minutesInputRef = useRef<HTMLInputElement>(null);

  // Sync state if initialSeconds changes externally
  useEffect(() => {
    if (!isEditing) {
      setMinutesStr(String(Math.floor(initialSeconds / 60)));
      setSecondsStr(String(initialSeconds % 60));
    }
  }, [initialSeconds, isEditing]);

  const busy = isSaving || localSaving;

  const formatDisplayTime = (secs: number) => {
    const safeSecs = Math.max(0, Number(secs) || 0);
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleStartEdit = () => {
    if (disabled || busy) return;
    setMinutesStr(String(Math.floor(initialSeconds / 60)));
    setSecondsStr(String(initialSeconds % 60));
    setIsEditing(true);
    setTimeout(() => {
      if (minutesInputRef.current) {
        minutesInputRef.current.focus();
        minutesInputRef.current.select();
      }
    }, 50);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setMinutesStr(String(Math.floor(initialSeconds / 60)));
    setSecondsStr(String(initialSeconds % 60));
  };

  const handleSave = async () => {
    if (busy) return;
    const m = Math.max(0, parseInt(minutesStr, 10) || 0);
    const rawS = parseInt(secondsStr, 10) || 0;
    const s = Math.min(59, Math.max(0, rawS));
    const newTotalSeconds = m * 60 + s;

    setLocalSaving(true);
    try {
      await onSave(newTotalSeconds);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save manual timer edit:', err);
    } finally {
      setLocalSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Status calculation
  const hasLimit = timeLimitSeconds !== undefined && timeLimitSeconds > 0;
  const isOvertime = hasLimit && initialSeconds > timeLimitSeconds;
  const overtimeDelta = isOvertime ? initialSeconds - timeLimitSeconds : 0;

  if (isEditing) {
    return (
      <Box
        component="div"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          flexWrap: 'wrap',
          p: 0.5,
          borderRadius: `${tokens.borderRadius.sm}px`,
          bgcolor: 'rgba(14, 107, 99, 0.05)',
          border: `1px solid ${tokens.colors.primary}50`,
          ...sx,
        }}
      >
        {/* Input Menit (MM) */}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
          <TextField
            inputRef={minutesInputRef}
            type="number"
            value={minutesStr}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setMinutesStr('');
                return;
              }
              const num = parseInt(val, 10);
              if (!isNaN(num) && num >= 0) {
                setMinutesStr(String(num));
              }
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
            disabled={busy}
            size="small"
            placeholder="0"
            inputProps={{
              min: 0,
              inputMode: 'numeric',
              style: {
                padding: '4px 6px',
                fontSize: '0.875rem',
                fontWeight: 700,
                textAlign: 'center',
                width: 44,
              },
            }}
            sx={{
              bgcolor: tokens.colors.background,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, fontWeight: 600, userSelect: 'none' }}>
            mnt
          </Typography>
        </Box>

        <Typography sx={{ fontWeight: 700, color: tokens.colors.text.secondary, userSelect: 'none' }}>:</Typography>

        {/* Input Detik (SS) */}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
          <TextField
            type="number"
            value={secondsStr}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setSecondsStr('');
                return;
              }
              let num = parseInt(val, 10);
              if (!isNaN(num)) {
                if (num < 0) num = 0;
                if (num > 59) num = 59;
                setSecondsStr(String(num));
              }
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
            disabled={busy}
            size="small"
            placeholder="0"
            inputProps={{
              min: 0,
              max: 59,
              inputMode: 'numeric',
              style: {
                padding: '4px 6px',
                fontSize: '0.875rem',
                fontWeight: 700,
                textAlign: 'center',
                width: 44,
              },
            }}
            sx={{
              bgcolor: tokens.colors.background,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, fontWeight: 600, userSelect: 'none' }}>
            dtk
          </Typography>
        </Box>

        {/* Tombol Simpan */}
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={12} color="inherit" /> : <Check size={14} />}
          sx={{
            minWidth: 0,
            px: 1.25,
            py: 0.5,
            height: 28,
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'none',
            bgcolor: tokens.colors.status.success,
            '&:hover': { bgcolor: '#059669' },
            boxShadow: 'none',
          }}
        >
          Simpan
        </Button>

        {/* Tombol Batal */}
        <Button
          variant="outlined"
          size="small"
          onClick={handleCancel}
          disabled={busy}
          startIcon={<X size={14} />}
          sx={{
            minWidth: 0,
            px: 1,
            py: 0.5,
            height: 28,
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'none',
            borderColor: tokens.colors.border,
            color: tokens.colors.text.secondary,
            '&:hover': { borderColor: tokens.colors.text.tertiary, bgcolor: 'rgba(0,0,0,0.03)' },
          }}
        >
          Batal
        </Button>
      </Box>
    );
  }

  // Normal Read-Only Display Mode with Inline Edit Trigger
  return (
    <Box
      component="div"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        ...sx,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontWeight: 700,
          color: isOvertime ? tokens.colors.status.danger : tokens.colors.text.primary,
          fontSize: size === 'medium' ? '1.125rem' : '0.9375rem',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatDisplayTime(initialSeconds)}
      </Typography>

      {/* Reactive Status Badge */}
      {showStatusBadge && hasLimit && (
        <Chip
          size="small"
          label={
            isOvertime
              ? `Overtime (+${formatDisplayTime(overtimeDelta)})`
              : 'Sesuai Standar'
          }
          sx={{
            fontWeight: 700,
            fontSize: '0.7rem',
            height: 20,
            bgcolor: isOvertime ? tokens.colors.status.dangerBg : tokens.colors.status.successBg,
            color: isOvertime ? tokens.colors.status.danger : tokens.colors.status.success,
            border: `1px solid ${isOvertime ? tokens.colors.status.danger : tokens.colors.status.success}30`,
          }}
        />
      )}

      {/* Edit Trigger Button */}
      {!disabled && (
        <Tooltip title="Edit Waktu Manual (Clean Overwrite)" arrow>
          <IconButton
            size="small"
            onClick={handleStartEdit}
            disabled={busy}
            sx={{
              p: 0.5,
              color: tokens.colors.primary,
              bgcolor: 'rgba(14, 107, 99, 0.06)',
              '&:hover': {
                bgcolor: 'rgba(14, 107, 99, 0.15)',
                color: tokens.colors.primaryLight,
              },
            }}
          >
            <Pencil size={13} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
