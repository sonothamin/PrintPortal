'use client';

import { createTheme, ThemeOptions } from '@mui/material/styles';

const getDesignTokens = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode tokens
          primary: { main: '#000000' },
          secondary: { main: '#ffffff' },
          background: { default: '#f8f9fa', paper: '#ffffff' },
          text: { primary: '#1a1a1a', secondary: '#6c757d' },
        }
      : {
          // AMOLED Dark mode tokens
          primary: { main: '#ffffff' },
          secondary: { main: '#000000' },
          background: { default: '#000000', paper: '#0a0a0a' },
          text: { primary: '#ffffff', secondary: '#a0a0a0' },
          divider: 'rgba(255, 255, 255, 0.12)',
        }),
  },
  typography: {
    fontFamily: '"Merriweather", serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          borderRadius: 10,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: mode === 'light' 
            ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
            : '0 4px 6px -1px rgb(255 255 255 / 0.05), 0 2px 4px -2px rgb(255 255 255 / 0.05)',
          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#000000' : '#ffffff',
          backgroundImage: 'none',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: mode,
        },
        html: {
          backgroundColor: mode === 'dark' ? '#000' : '#f8f9fa',
        },
        body: {
          backgroundColor: mode === 'dark' ? '#000' : '#f8f9fa',
          scrollbarWidth: 'thin',
          scrollbarColor: mode === 'dark' ? '#333 #000' : '#ccc #f8f9fa',
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: mode === 'dark' ? '#333 #000' : '#ccc #f8f9fa',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: mode === 'dark' ? '#000' : '#f8f9fa',
        },
        '*::-webkit-scrollbar-thumb': {
          background: mode === 'dark' ? '#333' : '#ccc',
          borderRadius: '10px',
          '&:hover': {
            background: mode === 'dark' ? '#444' : '#bbb',
          },
        },
      },
    },
  },
});

// export const useAppTheme = () => useTheme<typeof theme>();
export const createAppTheme = (mode: 'light' | 'dark') => createTheme(getDesignTokens(mode));
