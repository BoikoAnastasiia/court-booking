import { createTheme } from '@mui/material/styles';

/**
 * Light and dark palettes as CSS variables. `colorSchemeSelector: 'class'`
 * lets useColorScheme() switch between light / dark / system at runtime;
 * MUI persists the choice in localStorage.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#17805a' },
        background: { default: '#f4f6f5', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#4cc38a' },
        background: { default: '#0d1210', paper: '#151c19' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiTextField: { defaultProps: { size: 'small' } },
  },
});
