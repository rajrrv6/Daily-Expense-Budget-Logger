import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });

  const getSystemTheme = () => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 18;
    return systemPrefersDark || isNight ? 'dark' : 'light';
  };

  const [activeTheme, setActiveTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    if (savedTheme === 'system') {
      return getSystemTheme();
    }
    return savedTheme;
  });

  const setTheme = (newTheme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
  };

  useEffect(() => {
    const updateActiveTheme = () => {
      const root = window.document.documentElement;
      let resolvedTheme = theme;
      
      if (theme === 'system') {
        resolvedTheme = getSystemTheme();
      }
      
      setActiveTheme(resolvedTheme);
      
      if (resolvedTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };

    updateActiveTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        updateActiveTheme();
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      // Check time boundary transitions every 60 seconds
      const intervalId = setInterval(updateActiveTheme, 60000);
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
        clearInterval(intervalId);
      };
    }
  }, [theme]);

  const isDark = activeTheme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activeTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
