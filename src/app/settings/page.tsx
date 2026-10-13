'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import { Settings, RefreshCw, Link as LinkIcon, Lock, Clock, Target } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { tokens } from '@/lib/theme';

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <AppShell pageTitle="Pengaturan Sistem">
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Settings size={32} color={tokens.colors.primaryLight} />
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 700, color: tokens.colors.text.primary, lineHeight: 1.2 }}>
              Pengaturan Sistem
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
              Konfigurasi modul Syncrum Logistics Education Center dan integrasi SENDA
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: tokens.colors.border, mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.9rem' },
              '& .Mui-selected': { color: tokens.colors.primaryLight },
              '& .MuiTabs-indicator': { bgcolor: tokens.colors.primaryLight, height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            <Tab label="Integrasi SENDA" />
            <Tab label="Parameter Assessment" />
          </Tabs>
        </Box>

        {/* Tab 1: Integrasi SENDA */}
        {tabValue === 0 && (
          <Card elevation={0} sx={{ border: `1px solid ${tokens.colors.border}`, borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: tokens.colors.text.primary }}>
                    Status Koneksi
                  </Typography>
                  <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
                    Terakhir Sinkronisasi: Hari ini, 09:00 WIB
                  </Typography>
                </Box>
                <Chip 
                  icon={<LinkIcon size={16} />} 
                  label="Connected to SENDA Core" 
                  sx={{ 
                    bgcolor: tokens.colors.status.successBg, 
                    color: tokens.colors.status.success, 
                    fontWeight: 600,
                    '& .lucide': { color: tokens.colors.status.success }
                  }} 
                />
              </Box>
              
              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: tokens.colors.text.primary }}>
                Sinkronisasi Manual
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mb: 3, maxWidth: 600, lineHeight: 1.6 }}>
                Penambahan data driver, instruktur, dan lokasi dikelola terpusat melalui dashboard utama SENDA. Tarik data terbaru untuk memastikan database Syncrum Logistics Education Center up-to-date.
              </Typography>
              
              <Button 
                variant="outlined" 
                startIcon={<RefreshCw size={16} />}
                sx={{ 
                  fontWeight: 600,
                  borderColor: tokens.colors.border,
                  color: tokens.colors.text.primary,
                  '&:hover': {
                    bgcolor: tokens.colors.surfaceHover,
                    borderColor: tokens.colors.border
                  }
                }}
              >
                Sinkronisasi Data Master
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Parameter Assessment */}
        {tabValue === 1 && (
          <Card elevation={0} sx={{ border: `1px solid ${tokens.colors.border}`, borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, p: 2, bgcolor: tokens.colors.status.infoBg, borderRadius: 2 }}>
                <Lock size={20} color={tokens.colors.status.info} />
                <Typography variant="body2" sx={{ color: tokens.colors.status.info, fontWeight: 600 }}>
                  Parameter ini bersifat read-only dan diatur oleh CCR Pusat.
                </Typography>
              </Box>

              <List sx={{ p: 0 }}>
                <ListItem sx={{ px: 0, py: 2, borderBottom: `1px solid ${tokens.colors.borderLight}` }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Clock size={20} color={tokens.colors.text.secondary} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Batas Waktu Forklift"
                    secondary="10 Menit"
                    primaryTypographyProps={{ fontWeight: 600, color: tokens.colors.text.primary }}
                    secondaryTypographyProps={{ mt: 0.5 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 2 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Target size={20} color={tokens.colors.text.secondary} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Basis Poin DDT"
                    secondary="100 Poin"
                    primaryTypographyProps={{ fontWeight: 600, color: tokens.colors.text.primary }}
                    secondaryTypographyProps={{ mt: 0.5 }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        )}
      </Box>
    </AppShell>
  );
}
