import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext.jsx';
import { MessageSquare } from 'lucide-react';

export default function Register() {
    const { t } = useContext(LanguageContext);
    const [form, setForm] = useState({ username: '', password: '', role: 'student' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) =>
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) return setError(data.error || data.message);
            navigate('/login');
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
                    <h2>{t('joinPlatform')}</h2>
                    <p>{t('registerDesc')}</p>
                </div>
            </div>

            <div className="auth-form-side">
                <div className="auth-card">
                    <h1>{t('register')}</h1>
                    <p className="subtitle">{t('createStudentAccount')}</p>
                    <form onSubmit={handleSubmit}>
                        <div className="field-group">
                            <label htmlFor="reg-username">{t('username')}</label>
                            <input
                                id="reg-username"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                required
                                autoComplete="username"
                                placeholder="Choose a username"
                            />
                        </div>
                        <div className="field-group">
                            <label htmlFor="reg-password">{t('password')}</label>
                            <input
                                id="reg-password"
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                            />
                        </div>
                        {error && <p className="error">{error}</p>}
                        <button type="submit" className="btn-primary">{t('register')}</button>
                    </form>
                    <p className="footer">{t('hasAccount')} <Link to="/login">{t('login')}</Link></p>
                </div>
            </div>
        </div>
    );
}