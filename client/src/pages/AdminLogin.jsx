import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function AdminLogin() {
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

            if (!res.ok) return setError(data.message);

            if (data.role !== 'admin') {
                return setError('Unauthorized access. Admin privileges required.');
            }

            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('username', data.username);
            sessionStorage.setItem('role', data.role);

            navigate('/admin/dashboard');
        } catch {
            setError('Server connection failed.');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a' }}>
            <div className="auth-card" style={{ width: '100%', maxWidth: '400px', borderTop: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', color: '#ef4444' }}>
                    <ShieldAlert size={48} />
                </div>
                <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>Restricted Portal</h1>
                <p className="subtitle" style={{ textAlign: 'center', marginBottom: '24px' }}>Authorized IT personnel only.</p>
                
                <div style={{
                    marginBottom: '24px',
                    padding: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                    <h3 style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
                        Demo Credentials
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                        <span style={{ color: '#fff', fontWeight: '500' }}>Admin:</span>
                        <span style={{ fontFamily: 'monospace', color: '#ef4444', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>admin_demo / password123</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="field-group">
                        <label>Admin ID</label>
                        <input
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="field-group">
                        <label>Passkey</label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}
                    <button type="submit" className="btn-primary" style={{ background: '#ef4444' }}>Authenticate</button>
                </form>
            </div>
        </div>
    );
}
