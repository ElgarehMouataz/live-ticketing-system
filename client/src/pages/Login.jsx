import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext.jsx';
import { MessageSquare } from 'lucide-react';

export default function Login() {
    const { t } = useContext(LanguageContext);
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) =>
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) return setError(data.error || data.message);

            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('username', data.username);
            sessionStorage.setItem('role', data.role);
            sessionStorage.setItem('avatarUrl', data.avatarUrl || '');
            if (data.settings) {
                localStorage.setItem('settings', JSON.stringify(data.settings));
            }
            navigate('/dashboard');
        } catch {
            setError('Server error');
        }
    };

    return (
        <div className="auth-split">
            <div className="auth-brand">
                <div className="logo">
                    <MessageSquare size={28} />
                    <span>{t('appName')}</span>
                </div>
                <div className="quote">
                    <h2>Welcome back.</h2>
                    <p>Log in to your agent or student dashboard to manage your real-time support tickets.</p>
                </div>
            </div>
            
            <div className="auth-form-side">
                <div className="auth-card">
                    <h1>{t('login')}</h1>
                    <p className="subtitle">Enter your credentials to continue</p>
                    <form onSubmit={handleSubmit}>
                        <div className="field-group">
                            <label htmlFor="login-username">{t('username')}</label>
                            <input
                                id="login-username"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                required
                                autoComplete="username"
                                placeholder="e.g. student1"
                            />
                        </div>
                        <div className="field-group">
                            <label htmlFor="login-password">{t('password')}</label>
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                        </div>
                        {error && <p className="error">{error}</p>}
                        <button type="submit" className="btn-primary">{t('login')}</button>
                    </form>
                    <p className="footer">{t('noAccount')} <Link to="/register">{t('register')}</Link></p>
                </div>
            </div>
        </div>
    );
}