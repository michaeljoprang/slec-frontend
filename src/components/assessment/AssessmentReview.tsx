'use client';

import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Divider,
  Grid,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  TextField,
} from '@mui/material';
import { CheckCircle2, XCircle, ArrowLeft, Send, ChevronDown } from 'lucide-react';
import { tokens } from '@/lib/theme';
import type { DDTHeaderInfo, AssessmentSection, AnswerMap, DDTScoreResult } from '@/lib/assessment';

interface AssessmentReviewProps {
  headerInfo: DDTHeaderInfo;
  sections: AssessmentSection[];
  answers: AnswerMap;
  scoreResult: DDTScoreResult;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  assessmentType?: string;
  tmminFrequencies?: Record<string, number>;
  trainerNotes?: string;
  setTrainerNotes?: (val: string) => void;
}

export default function AssessmentReview({
  headerInfo,
  sections,
  answers,
  scoreResult,
  onBack,
  onSubmit,
  isSubmitting = false,
  assessmentType = 'DDT',
  tmminFrequencies = {},
  trainerNotes = '',
  setTrainerNotes,
}: AssessmentReviewProps) {
  const { totalPoint, totalDeduction, actual, score, result } = scoreResult;
  const isPassing = result === 'PASS';

  return (
    <Box>
      {/* Result banner */}
      <Paper
        sx={{
          p: 3,
          mb: 2,
          border: `2px solid ${isPassing ? tokens.colors.status.success : tokens.colors.status.danger}`,
          bgcolor: isPassing ? tokens.colors.status.successBg : tokens.colors.status.dangerBg,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {isPassing ? (
            <CheckCircle2 size={40} color={tokens.colors.status.success} />
          ) : (
            <XCircle size={40} color={tokens.colors.status.danger} />
          )}
          <Box>
            <Typography
              sx={{
                fontSize: '2rem',
                fontWeight: 800,
                color: isPassing ? tokens.colors.status.success : tokens.colors.status.danger,
                lineHeight: 1,
              }}
            >
              {result}
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mt: 0.25 }}>
              {assessmentType === 'TMMIN_REFRESHMENT' ? 'Forklift - Refreshment' : assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD' ? 'Forklift - Standard' : 'Truck Assessment DDT'}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto', textAlign: 'right' }}>
            <Typography sx={{ fontSize: '2.25rem', fontWeight: 800, color: tokens.colors.text.primary, lineHeight: 1 }}>
              {score.toFixed(1)}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>
              Nilai Akhir
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          {[
            { label: 'Total Point', value: totalPoint },
            { label: 'Total Deduction', value: `-${totalDeduction}` },
            { label: 'Actual', value: actual },
            { label: 'Score', value: score.toFixed(1) },
          ].map(({ label, value }) => (
            <Grid item xs={6} sm={3} key={label}>
              <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, display: 'block' }}>
                {label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
                {value}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Header info */}
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: tokens.colors.text.primary }}>
          Informasi Peserta
        </Typography>
        <Grid container spacing={1.5}>
          {[
            ['Tanggal', headerInfo.tanggal],
            ['Lokasi Test', headerInfo.lokasiTest],
            ['Jenis Kendaraan', headerInfo.jenisKendaraan],
            ['No Polisi', headerInfo.noPolisi],
            ['Nama Peserta', headerInfo.namaPeserta],
            ['Umur', headerInfo.umur],
            ['Gol SIM / Terbitan', headerInfo.golSIM],
            ['Masa Berlaku SIM', headerInfo.masaBerlakuSIM],
            ['Instruktur', headerInfo.instruktur],
          ].map(([label, value]) => (
            <Grid item xs={12} sm={6} md={4} key={label}>
              <Box>
                <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>
                  {label}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, color: tokens.colors.text.primary }}>
                  {value || '—'}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Section summaries */}
      {sections.map((section: any, idx) => {
        const sScore = scoreResult.sectionScores[idx];
        const deduction = sScore?.deduction ?? 0;

        return (
          <Accordion
            key={section.id || section.code}
            elevation={0}
            sx={{
              mb: 1.5,
              border: `1px solid ${tokens.colors.border}`,
              '&:before': { display: 'none' },
              borderRadius: `${tokens.borderRadius.md}px !important`,
              overflow: 'hidden',
            }}
          >
            <AccordionSummary
              expandIcon={<ChevronDown size={20} color={tokens.colors.text.secondary} />}
              sx={{ p: 2.5, bgcolor: tokens.colors.background }}
            >
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
                    {section.label || section.name}
                  </Typography>
                  {deduction > 0 ? (
                    <Chip
                      label={`-${deduction} poin`}
                      sx={{ bgcolor: tokens.colors.status.dangerBg, color: tokens.colors.status.danger, fontWeight: 700 }}
                    />
                  ) : (
                    <Chip
                      label="No deduction"
                      sx={{ bgcolor: tokens.colors.status.successBg, color: tokens.colors.status.success, fontWeight: 600 }}
                    />
                  )}
                </Box>
                
                {assessmentType === 'DDT' ? (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ color: tokens.colors.status.success, fontWeight: 600 }}>
                      YES: {section.items.filter((i: any) => answers[i.id] === 'YES').length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.colors.status.danger, fontWeight: 600 }}>
                      NO: {section.items.filter((i: any) => answers[i.id] === 'NO').length}
                    </Typography>
                    {section.items.filter((i: any) => !answers[i.id]).length > 0 && (
                      <Typography variant="body2" sx={{ color: tokens.colors.status.warning, fontWeight: 600 }}>
                        Belum dijawab: {section.items.filter((i: any) => !answers[i.id]).length}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ color: tokens.colors.status.danger, fontWeight: 600 }}>
                      Mistakes recorded: {section.items.reduce((sum: number, i: any) => sum + (tmminFrequencies[i.id] || 0), 0)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </AccordionSummary>
            <Divider />
            <AccordionDetails sx={{ p: 0, bgcolor: tokens.colors.borderLight }}>
              <List disablePadding>
                {section.items.map((item: any, itemIdx: number) => {
                  const isLast = itemIdx === section.items.length - 1;
                  
                  if (assessmentType === 'DDT') {
                    const ans = answers[item.id];
                    const isNo = ans === 'NO';
                    const isUnanswered = !ans;
                    return (
                      <ListItem 
                        key={item.id} 
                        divider={!isLast}
                        sx={{ py: 1.5, px: 2.5 }}
                      >
                        <ListItemText
                          primary={item.description}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: { color: isNo ? tokens.colors.status.danger : tokens.colors.text.primary, fontWeight: isNo ? 600 : 400 }
                          }}
                        />
                        <Box sx={{ ml: 2, minWidth: 40, textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: isNo ? tokens.colors.status.danger : isUnanswered ? tokens.colors.status.warning : tokens.colors.status.success }}>
                            {ans || '—'}
                          </Typography>
                        </Box>
                      </ListItem>
                    );
                  } else {
                    const freq = tmminFrequencies[item.id] || 0;
                    const hasDeduction = freq > 0;
                    return (
                      <ListItem 
                        key={item.id} 
                        divider={!isLast}
                        sx={{ py: 1.5, px: 2.5 }}
                      >
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: { color: hasDeduction ? tokens.colors.status.danger : tokens.colors.text.primary, fontWeight: hasDeduction ? 600 : 400 }
                          }}
                        />
                        <Box sx={{ ml: 2, minWidth: 60, textAlign: 'right', display: 'flex', gap: 1, alignItems: 'center' }}>
                          {hasDeduction && (
                            <Chip label={`-${freq * item.deduction}`} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: tokens.colors.status.dangerBg, color: tokens.colors.status.danger, fontWeight: 700 }} />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 700, color: hasDeduction ? tokens.colors.status.danger : tokens.colors.text.secondary }}>
                            {freq}x
                          </Typography>
                        </Box>
                      </ListItem>
                    );
                  }
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Trainer Notes */}
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: tokens.colors.text.primary }}>
          Catatan Trainer
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          placeholder="Tambahkan catatan, observasi, atau rekomendasi..."
          value={trainerNotes}
          onChange={(e) => setTrainerNotes?.(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: `${tokens.borderRadius.md}px`,
            }
          }}
        />
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft size={18} />}
          onClick={onBack}
          size="large"
          sx={{ minWidth: 140, minHeight: 52 }}
        >
          Kembali
        </Button>
        <Button
          variant="contained"
          endIcon={<Send size={18} />}
          onClick={onSubmit}
          disabled={isSubmitting}
          size="large"
          sx={{
            minWidth: 200,
            minHeight: 52,
            fontWeight: 700,
            fontSize: '1rem',
            bgcolor: isPassing ? tokens.colors.status.success : tokens.colors.status.danger,
            '&:hover': {
              bgcolor: isPassing ? '#059669' : '#dc2626',
            },
          }}
        >
          {isSubmitting ? 'Menyimpan...' : 'Submit Assessment'}
        </Button>
      </Box>
    </Box>
  );
}
