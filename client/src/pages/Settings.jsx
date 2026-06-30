import { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext.jsx';
import { LanguageContext } from '../context/LanguageContext.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Settings() {
    const { theme, fontSize, setTheme, setFontSize, toggleTheme } = useContext(ThemeContext);
    const { language, setLanguage, t } = useContext(LanguageContext);
    const navigate = useNavigate();

    const token = sessionStorage.getItem('token');
    const storedAvatar = sessionStorage.getItem('avatarUrl');
    const username = sessionStorage.getItem('username') || '';

    const [avatarUrl, setAvatarUrl] = useState(storedAvatar || '');
    const isDemo = username.endsWith('_demo');
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
    const [pwMsg, setPwMsg] = useState({ text: '', type: '' });
    const [settingsMsg, setSettingsMsg] = useState({ text: '', type: '' });
    const [avatarMsg, setAvatarMsg] = useState({ text: '', type: '' });
    const fileRef = useRef(null);

    const authHeaders = { Authorization: `Bearer ${token}` };

    const savePreferences = async () => {
        setSettingsMsg({ text: '', type: '' });
        try {
            const res = await fetch(`${API}/api/users/profile/settings`, {
                method: 'PUT',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme, fontSize, language }),
            });
            if (!res.ok) throw new Error();
            localStorage.setItem('settings', JSON.stringify({ theme, fontSize, language }));
            setSettingsMsg({ text: 'Saved', type: 'success' });
        } catch {
            setSettingsMsg({ text: 'Failed to save', type: 'error' });
        }
    };

    const changePassword = async (e) => {
        e.preventDefault();
        setPwMsg({ text: '', type: '' });
        try {
            const res = await fetch(`${API}/api/users/profile/password`, {
                method: 'PUT',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(pwForm),
            });
            const data = await res.json();
            if (!res.ok) return setPwMsg({ text: data.error, type: 'error' });
            setPwMsg({ text: data.message, type: 'success' });
            setPwForm({ currentPassword: '', newPassword: '' });
        } catch {
            setPwMsg({ text: 'Server error', type: 'error' });
        }
    };

    const uploadAvatar = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarMsg({ text: '', type: '' });
        const fd = new FormData();
        fd.append('avatar', file);
        try {
            const res = await fetch(`${API}/api/users/profile/avatar`, {
                method: 'PUT',
                headers: authHeaders,
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAvatarUrl(data.avatarUrl);
            sessionStorage.setItem('avatarUrl', data.avatarUrl);
            setAvatarMsg({ text: 'Updated', type: 'success' });
        } catch (err) {
            setAvatarMsg({ text: err.message || 'Upload failed', type: 'error' });
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>{t('settings')}</h1>
                <button className="header-btn" onClick={() => navigate('/dashboard')}>
                    {t('back')}
                </button>
            </div>

            <div className="settings-section">
                <h2>{t('avatar')}</h2>
                <div className="avatar-section">
                    <div className="avatar-preview">
                        {avatarUrl
                            ? <img src={avatarUrl} alt="" />
                            : username.charAt(0).toUpperCase()
                        }
                    </div>
                    <div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            onChange={uploadAvatar}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="avatar-upload-btn"
                            onClick={() => fileRef.current?.click()}
                        >
                            {t('upload')}
                        </button>
                        {avatarMsg.text && (
                            <p className={`settings-msg ${avatarMsg.type}`}>{avatarMsg.text}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2>{t('appearance')}</h2>
                <div className="setting-row">
                    <label>{t('theme')}</label>
                    <div
                        className={`toggle-switch ${theme === 'dark' ? 'active' : ''}`}
                        onClick={toggleTheme}
                        role="switch"
                        aria-checked={theme === 'dark'}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && toggleTheme()}
                    />
                </div>
                <div className="setting-row">
                    <label>{t('fontSize')}</label>
                    <div className="radio-group">
                        {['small', 'medium', 'large'].map(size => (
                            <label key={size}>
                                <input
                                    type="radio"
                                    name="fontSize"
                                    value={size}
                                    checked={fontSize === size}
                                    onChange={() => setFontSize(size)}
                                />
                                {t(size)}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="setting-row">
                    <label>{t('language')}</label>
                    <select value={language} onChange={e => setLanguage(e.target.value)}>
                        <option value="en">English</option>
                        <option value="fr">Francais</option>
                        <option value="de">Deutsch</option>
                    </select>
                </div>
                <div style={{ marginTop: 16 }}>
                    <button className="save-settings-btn" onClick={savePreferences}>
                        {t('saveSettings')}
                    </button>
                    {settingsMsg.text && (
                        <p className={`settings-msg ${settingsMsg.type}`}>{settingsMsg.text}</p>
                    )}
                </div>
            </div>

            <div className="settings-section">
                <h2>{t('changePassword')}</h2>
                {isDemo ? (
                    <div style={{
                        padding: '16px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        opacity: 0.7
                    }}>
                        Password changes are disabled for demo accounts.
                    </div>
                ) : (
                    <form className="password-form" onSubmit={changePassword}>
                        <input
                            type="password"
                            placeholder={t('currentPassword')}
                            value={pwForm.currentPassword}
                            onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                            required
                            autoComplete="current-password"
                        />
                        <input
                            type="password"
                            placeholder={t('newPassword')}
                            value={pwForm.newPassword}
                            onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                            required
                            autoComplete="new-password"
                        />
                        <button type="submit">{t('updatePassword')}</button>
                        {pwMsg.text && (
                            <p className={`settings-msg ${pwMsg.type}`}>{pwMsg.text}</p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}