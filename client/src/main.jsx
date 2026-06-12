import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import App from './App.jsx';
import './index.css';

function getStoredSettings() {
    try { return JSON.parse(localStorage.getItem('settings')) || {}; }
    catch { return {}; }
}

const settings = getStoredSettings();

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <ThemeProvider initialSettings={settings}>
            <LanguageProvider initialLanguage={settings.language}>
                <App />
            </LanguageProvider>
        </ThemeProvider>
    </BrowserRouter>
);