import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // localStorage에서 테마 불러오기, 기본값은 'light' (화이트모드)
    const savedTheme = localStorage.getItem('booth-talk-theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    // HTML에 data-theme 속성 설정
    document.documentElement.setAttribute('data-theme', theme);
    // localStorage에 저장
    localStorage.setItem('booth-talk-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
