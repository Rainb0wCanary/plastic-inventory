import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
      contrastText: '#fff',
    },
    secondary: {
      main: '#5c6bc0',
    },
    error: {
      main: '#e53935',
    },
    success: {
      main: '#43a047',
    },
    warning: {
      main: '#ffa726',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    button: {
      fontWeight: 600,
      letterSpacing: '0.5px',
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          padding: '8px 20px',
          fontWeight: 600,
          letterSpacing: '0.5px',
        },
        containedPrimary: {
          background: 'linear-gradient(90deg, #3f51b5 0%, #5c6bc0 100%)',
        },
        outlined: {
          borderWidth: 2,
        },
      },
    },
  },
});

export default theme;
