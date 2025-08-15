import { createContext, useContext, ReactNode, useMemo } from 'react'
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { useConfig } from './ConfigContext'

// Base theme configuration
const createBaseTheme = (primaryColor: string, secondaryColor: string): Theme => {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: primaryColor,
      },
      secondary: {
        main: secondaryColor,
      },
      success: {
        main: '#10B981', // Green
      },
      warning: {
        main: '#F59E0B', // Yellow
      },
      error: {
        main: '#EF4444', // Red
      },
      grey: {
        500: '#6B7280', // Neutral gray
      },
      background: {
        default: '#F9FAFB',
        paper: '#FFFFFF',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      body1: {
        fontSize: '14px',
      },
      body2: {
        fontSize: '14px',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': {
              boxShadow: `0 0 0 2px ${primaryColor}1a`,
            },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: `0 0 0 2px ${primaryColor}1a`,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: '12px',
            textTransform: 'uppercase',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: '12px',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
  })
}

interface CustomThemeContextType {
  theme: Theme
  customCSS: string
}

const CustomThemeContext = createContext<CustomThemeContextType>({
  theme: createBaseTheme('#1976d2', '#dc004e'),
  customCSS: ''
})

export const useCustomTheme = () => {
  const context = useContext(CustomThemeContext)
  if (!context) {
    throw new Error('useCustomTheme must be used within a CustomThemeProvider')
  }
  return context
}

interface CustomThemeProviderProps {
  children: ReactNode
}

export function CustomThemeProvider({ children }: CustomThemeProviderProps) {
  const { config } = useConfig()
  
  const theme = useMemo(() => {
    const primaryColor = config?.theme_primary_color || '#1976d2'
    const secondaryColor = config?.theme_secondary_color || '#dc004e'
    return createBaseTheme(primaryColor, secondaryColor)
  }, [config?.theme_primary_color, config?.theme_secondary_color])

  const customCSS = config?.custom_css || ''

  const contextValue: CustomThemeContextType = {
    theme,
    customCSS
  }

  return (
    <CustomThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {customCSS && (
          <style dangerouslySetInnerHTML={{ __html: customCSS }} />
        )}
        {children}
      </MuiThemeProvider>
    </CustomThemeContext.Provider>
  )
}