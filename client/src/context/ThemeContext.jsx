import { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children, initialSettings }) {
    const [theme, setTheme] = useState(initialSettings?.theme || 'dark');
    const [fontSize, setFontSize] = useState(initialSettings?.fontSize || 'medium');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.className = `font-size-${fontSize}`;
    }, [theme, fontSize]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    return (
        <ThemeContext.Provider value={{ theme, fontSize, setTheme, setFontSize, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
