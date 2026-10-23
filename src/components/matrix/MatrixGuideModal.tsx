'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
} from '@mui/material';
import { X, HelpCircle, Truck, Forklift, Award, BookOpen } from 'lucide-react';
import { tokens } from '@/lib/themeTokens';

export interface MatrixGuideModalProps {
  open: boolean;
  onClose: () => void;
}

const drivingAspects = [
  { code: 'D0', label: 'Analisis & Bahaya', description: 'Menganalisis dan melaporkan kondisi bahaya saat berkendara.' },
  { code: 'D1', label: 'Operasional Truk', description: 'Mengoperasikan truk dengan benar, stabil, dan aman sesuai SOP.' },
  { code: 'D2', label: 'Kondisi Abnormal', description: 'Menangani situasi dan kondisi abnormal sesuai SOP pekerjaan.' },
  { code: 'D3', label: 'Rute & Dokumen', description: 'Melakukan pengiriman di berbagai rute dan pengisian dokumen resmi.' },
  { code: 'D4', label: 'PTI Truk', description: 'Melakukan pengecekan kendaraan sebelum & sesudah jalan (PTI).' },
];

const forkliftAspects = [
  { code: 'F0', label: 'Analisis Bahaya', description: 'Menganalisis dan melaporkan kondisi bahaya di area forklift.' },
  { code: 'F1', label: 'Operasional Forklift', description: 'Mengoperasikan forklift dengan benar, presisi, dan aman.' },
  { code: 'F2', label: 'Dasar Pemeliharaan', description: 'Memahami dasar pemeliharaan dan pengoperasian unit forklift.' },
  { code: 'F3', label: 'Aturan & SOP', description: 'Memahami dan menjalankan aturan keselamatan serta SOP yang berlaku.' },
  { code: 'F4', label: 'PTI Forklift', description: 'Melakukan pengecekan unit forklift harian (PTI & kelengkapan APD).' },
];

const scoreLevels = [
  {
    score: 0,
    label: 'Unskilled',
    scoreRange: 'Skor < 50%',
    color: '#E31B23',
    bg: '#FDEAEA',
    badgeBg: '#fee2e2',
    badgeText: '#b91c1c',
    description: 'Tidak tahu dan tidak dapat melakukan pekerjaan sama sekali.',
  },
  {
    score: 1,
    label: 'Basic',
    scoreRange: 'Skor 50% – 69%',
    color: '#1596B7',
    bg: '#E8F7FB',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
    description: 'Mengetahui dasar pekerjaan yang dilakukan.',
  },
  {
    score: 2,
    label: 'Intermediate',
    scoreRange: 'Skor 70% – 79%',
    color: '#D08A00',
    bg: '#FFF3D8',
    badgeBg: '#fef3c7',
    badgeText: '#b45309',
    description: 'Mampu bekerja, masih perlu pengawasan dan bantuan instruktur/atasan.',
  },
  {
    score: 3,
    label: 'Advanced',
    scoreRange: 'Skor 80% – 89%',
    color: '#9A9800',
    bg: '#FFFBD8',
    badgeBg: '#fef9c3',
    badgeText: '#854d0e',
    description: 'Mampu bekerja sendiri dan bertanggung jawab penuh atas tugasnya.',
  },
  {
    score: 4,
    label: 'Expert',
    scoreRange: 'Skor 90% – 100%',
    color: '#15965C',
    bg: '#E8F6ED',
    badgeBg: '#dcfce7',
    badgeText: '#15803d',
    description: 'Mampu memberikan pengetahuan dan melatih rekan kerja secara profesional.',
  },
];

export default function MatrixGuideModal({ open, onClose }: MatrixGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'driving' | 'forklift'>('all');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: `${tokens.borderRadius.lg}px`,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 0,
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#f8fafc',
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.15rem' }}>
                Panduan Aspek & Skala Penilaian Matrix
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                Standar evaluasi kompetensi operasional driver SYNCRUM LOGISTICS EDUCATION CENTER (SLEC)
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: '#64748b',
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Body */}
      <DialogContent sx={{ p: 3, bgcolor: '#ffffff', maxHeight: '72vh', overflowY: 'auto' }}>
        {/* Bagian 1: Skala Penilaian */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Award size={18} className="text-amber-500" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Skala Penilaian Kompetensi (0 – 4)
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2, fontSize: '0.84rem' }}>
            Setiap aspek dinilai dalam skala 0 sampai 4, atau dikosongkan (—) jika belum dilakukan assessment:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {scoreLevels.map((item) => (
              <Box
                key={item.score}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  transition: 'background-color 0.15s ease',
                  '&:hover': { bgcolor: '#f8fafc' },
                }}
              >
                {/* Score Number Badge */}
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    minWidth: 38,
                    borderRadius: '8px',
                    bgcolor: item.color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {item.score}
                </Box>

                {/* Score Label, Percentage Range & Description */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.35, flexWrap: 'wrap' }}>
                    <span
                      className="rounded-md px-2.5 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: item.badgeBg, color: item.badgeText }}
                    >
                      {item.label}
                    </span>
                    <span className="rounded-md border border-slate-200 bg-slate-100/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                      {item.scoreRange}
                    </span>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.85rem', lineHeight: 1.4 }}>
                    {item.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Bagian 2: Rincian Aspek */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpCircle size={18} className="text-blue-600" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                Rincian Aspek Penilaian
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua Aspek
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('driving')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === 'driving'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Driving (D0-D4)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('forklift')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === 'forklift'
                    ? 'bg-sky-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Forklift (F0-F4)
              </button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: activeTab === 'all' ? '1fr 1fr' : '1fr' }, gap: 2.5 }}>
            {/* Aspek Driving */}
            {(activeTab === 'all' || activeTab === 'driving') && (
              <Box
                sx={{
                  border: '1px solid #e0e7ff',
                  borderRadius: '12px',
                  p: 2,
                  bgcolor: '#fbfcfd',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1, borderBottom: '1px solid #e0e7ff' }}>
                  <Truck size={18} className="text-indigo-600" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e1b4b', letterSpacing: '0.02em' }}>
                    ASPEK DRIVING (D0 – D4)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {drivingAspects.map((aspect) => (
                    <Box key={aspect.code} sx={{ display: 'flex', gap: 1.5 }}>
                      <span className="inline-flex h-6 w-8 min-w-[32px] items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-xs font-black text-indigo-700">
                        {aspect.code}
                      </span>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                          {aspect.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.4 }}>
                          {aspect.description}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Aspek Forklift */}
            {(activeTab === 'all' || activeTab === 'forklift') && (
              <Box
                sx={{
                  border: '1px solid #bae6fd',
                  borderRadius: '12px',
                  p: 2,
                  bgcolor: '#fbfcfd',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1, borderBottom: '1px solid #bae6fd' }}>
                  <Forklift size={18} className="text-sky-600" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#082f49', letterSpacing: '0.02em' }}>
                    ASPEK FORKLIFT (F0 – F4)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {forkliftAspects.map((aspect) => (
                    <Box key={aspect.code} sx={{ display: 'flex', gap: 1.5 }}>
                      <span className="inline-flex h-6 w-8 min-w-[32px] items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-xs font-black text-sky-700">
                        {aspect.code}
                      </span>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                          {aspect.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.4 }}>
                          {aspect.description}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            textTransform: 'none',
            borderRadius: '8px',
            bgcolor: tokens.colors.primary,
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: tokens.colors.primaryDark },
          }}
        >
          Tutup Panduan
        </Button>
      </DialogActions>
    </Dialog>
  );
}
