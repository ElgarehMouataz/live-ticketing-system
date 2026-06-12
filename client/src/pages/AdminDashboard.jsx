import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Plus, LogOut } from 'lucide-react';

export default function AdminDashboard() {
    const token = sessionStorage.getItem('token');
    const role = sessionStorage.getItem('role');
    const navigate = useNavigate();

    const [agents, setAgents] = useState([]);
    const [form, setForm] = useState({ username: '', password: '' });
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || role !== 'admin') {
            navigate('/admin/login');
            return;
        }
        fetchAgents();
    }, [token, role, navigate]);

    const fetchAgents = async () => {
        try {
            const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API}/api/admin/agents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAgents(data);
            }
        } catch (err) {
            console.error('Failed to fetch agents', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAgent = async (e) => {
        e.preventDefault();
        setStatus({ type: '', msg: '' });

        try {
            const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API}/api/admin/agents`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();

            if (res.ok) {
                setStatus({ type: 'success', msg: `Agent ${data.agent.username} provisioned successfully.` });
                setForm({ username: '', password: '' });
                fetchAgents();
            } else {
                setStatus({ type: 'error', msg: data.message || 'Provisioning failed.' });
            }
        } catch (err) {
            setStatus({ type: 'error', msg: 'Network error.' });
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/admin/login');
    };

    if (loading) return null;

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #333' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Shield color="#ef4444" size={32} />
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>IT Lead Control Panel</h1>
                    </div>
                    <button onClick={handleLogout} className="cancel-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                        <LogOut size={16} /> Logout
                    </button>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
                    
                    {/* Left: Provisioning Form */}
                    <div className="auth-card" style={{ background: '#111', border: '1px solid #222', padding: '24px' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={20} color="#ef4444" /> Provision New Agent
                        </h2>
                        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '24px' }}>
                            Create a secure account for a new support staff member.
                        </p>

                        <form onSubmit={handleCreateAgent}>
                            <div className="field-group">
                                <label>Agent Username</label>
                                <input
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    required
                                    style={{ background: '#000', border: '1px solid #333', color: '#fff' }}
                                />
                            </div>
                            <div className="field-group">
                                <label>Temporary Password</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    style={{ background: '#000', border: '1px solid #333', color: '#fff' }}
                                />
                            </div>
                            
                            {status.msg && (
                                <div style={{ 
                                    padding: '12px', 
                                    borderRadius: '6px', 
                                    marginBottom: '16px',
                                    fontSize: '0.9rem',
                                    background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                    color: status.type === 'error' ? '#ef4444' : '#22c55e',
                                    border: `1px solid ${status.type === 'error' ? '#ef4444' : '#22c55e'}`
                                }}>
                                    {status.msg}
                                </div>
                            )}

                            <button type="submit" className="btn-primary" style={{ background: '#ef4444' }}>
                                Provision Account
                            </button>
                        </form>
                    </div>

                    {/* Right: Active Agents List */}
                    <div className="auth-card" style={{ background: '#111', border: '1px solid #222', padding: '24px' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={20} color="#3b82f6" /> Active Agents Directory
                        </h2>
                        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '24px' }}>
                            Currently authorized staff members in the system.
                        </p>

                        {agents.length === 0 ? (
                            <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>No agents provisioned yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {agents.map(agent => (
                                    <div key={agent._id} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        padding: '16px', 
                                        background: '#000', 
                                        borderRadius: '8px',
                                        border: '1px solid #333'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{agent.username}</div>
                                            <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '4px' }}>ID: {agent._id}</div>
                                        </div>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
                                            Authorized
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
