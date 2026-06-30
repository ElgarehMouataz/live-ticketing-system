import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import { LanguageContext } from '../context/LanguageContext.jsx';
import { Paperclip, Smile, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return time;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

const EMOJIS = ['😀', '😂', '😍', '😭', '👍', '🙏', '🔥', '❤️', '🎉', '🤔'];

export default function Dashboard() {
    const token = sessionStorage.getItem('token');
    const username = sessionStorage.getItem('username') === 'undefined' ? '' : (sessionStorage.getItem('username') || '');
    const role = sessionStorage.getItem('role') === 'undefined' ? '' : (sessionStorage.getItem('role') || '');
    const navigate = useNavigate();
    const { t } = useContext(LanguageContext);
    const { socket, isConnected } = useSocket(token);

    const [tickets, setTickets] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [remoteTyping, setRemoteTyping] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [createForm, setCreateForm] = useState({ subject: '', urgency: 'medium' });

    // New states for File/Emoji
    const [attachment, setAttachment] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);
    const typingTimer = useRef(null);
    const isTypingRef = useRef(false);
    const fileInputRef = useRef(null);
    const selectedIdRef = useRef(selectedId);

    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    // Clear typing timer on unmount to prevent state updates on dead component
    useEffect(() => {
        return () => clearTimeout(typingTimer.current);
    }, []);

    const authHeaders = { Authorization: `Bearer ${token}` };
    const selected = tickets.find(t => t._id === selectedId);

    // Fetch tickets on mount
    useEffect(() => {
        fetch(`${API}/api/tickets`, { headers: authHeaders })
            .then(r => {
                if (r.status === 401) { navigate('/login'); return null; }
                return r.json();
            })
            .then(data => { if (data && Array.isArray(data)) setTickets(data); })
            .catch(() => showToast('Failed to load tickets. Check your connection.'));
    }, []);

    // Socket event bindings
    useEffect(() => {
        if (!socket) return;

        const onNewTicket = (ticket) => {
            setTickets(prev => {
                if (prev.some(t => t._id === ticket._id)) return prev;
                return [ticket, ...prev];
            });
        };

        const onTicketUpdate = (ticket) => {
            setTickets(prev => prev.map(t => t._id === ticket._id ? ticket : t));
        };

        const onMessage = (msg) => {
            setMessages(prev => {
                if (prev.some(m => m._id === msg._id)) return prev;
                return [...prev, msg];
            });
        };

        const onTyping = ({ ticketId, username: who, isTyping }) => {
            if (who === username) return;
            if (ticketId !== selectedIdRef.current) return;
            setRemoteTyping(isTyping ? who : null);
        };

        socket.on('ticket:new_broadcast', onNewTicket);
        socket.on('ticket:update', onTicketUpdate);
        socket.on('ticket:claimed', onTicketUpdate);
        socket.on('chat:message_received', onMessage);
        socket.on('chat:typing_update', onTyping);

        return () => {
            socket.off('ticket:new_broadcast', onNewTicket);
            socket.off('ticket:update', onTicketUpdate);
            socket.off('ticket:claimed', onTicketUpdate);
            socket.off('chat:message_received', onMessage);
            socket.off('chat:typing_update', onTyping);
        };
    }, [socket, username]);

    // Auto-scroll on new messages
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (nearBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = useCallback(async (ticketId, before) => {
        const url = new URL(`${API}/api/tickets/${ticketId}/messages`);
        if (before) url.searchParams.set('before', before);
        url.searchParams.set('limit', '30');

        const res = await fetch(url, { headers: authHeaders });
        const data = await res.json();
        return data;
    }, [token]);

    const selectTicket = async (ticketId) => {
        if (ticketId === selectedId) return;
        setSelectedId(ticketId);
        setMessages([]);
        setHasMore(true);
        setRemoteTyping(null);
        setInput('');
        setAttachment(null);
        setShowEmoji(false);

        if (socket) socket.emit('ticket:join', { ticketId });

        try {
            const msgs = await loadMessages(ticketId);
            setMessages(msgs);
            setHasMore(msgs.length >= 30);
            setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
        } catch {
            showToast('Could not load messages.');
            setMessages([]);
        }
    };

    const loadOlder = async () => {
        if (loadingHistory || !hasMore || !selectedId || messages.length === 0) return;
        setLoadingHistory(true);
        const el = containerRef.current;
        const prevHeight = el?.scrollHeight || 0;

        try {
            const oldest = messages[0]?.createdAt;
            const older = await loadMessages(selectedId, oldest);
            setHasMore(older.length >= 30);
            setMessages(prev => [...older, ...prev]);
            requestAnimationFrame(() => {
                if (el) el.scrollTop = el.scrollHeight - prevHeight;
            });
        } catch {}
        setLoadingHistory(false);
    };

    const handleCreate = (e) => {
        e.preventDefault();
        if (!socket || !createForm.subject.trim()) return;
        socket.emit('ticket:create', {
            subject: createForm.subject.trim(),
            urgency: createForm.urgency,
        });
        setCreateForm({ subject: '', urgency: 'medium' });
        setShowForm(false);
    };

    const handleClaim = (ticketId) => {
        if (!socket) return;
        socket.emit('ticket:claim', { ticketId });
    };

    const handleResolve = () => {
        if (!socket || !selectedId) return;
        socket.emit('ticket:resolve', { ticketId: selectedId });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast(t('fileTooLarge') || 'File exceeds 5MB limit');
            e.target.value = '';
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('attachment', file);

        try {
            const res = await fetch(`${API}/api/tickets/upload`, {
                method: 'POST',
                headers: authHeaders,
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setAttachment(data);
            } else {
                showToast(data.error || 'Upload failed');
            }
        } catch (err) {
            showToast('Upload failed. Check your connection.');
        }
        setUploading(false);
        e.target.value = '';
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!socket || !selectedId || (!input.trim() && !attachment)) return;
        
        socket.emit('chat:message_send', {
            ticketId: selectedId,
            text: input.trim(),
            attachment
        });
        stopTyping();
        setInput('');
        setAttachment(null);
        setShowEmoji(false);
    };

    const startTyping = () => {
        if (!socket || !selectedId || isTypingRef.current) return;
        isTypingRef.current = true;
        socket.emit('chat:typing_start', { ticketId: selectedId });
    };

    const stopTyping = () => {
        if (!socket || !selectedId || !isTypingRef.current) return;
        isTypingRef.current = false;
        socket.emit('chat:typing_stop', { ticketId: selectedId });
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        startTyping();
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(stopTyping, 2000);
    };

    const addEmoji = (emoji) => {
        setInput(prev => prev + emoji);
        setShowEmoji(false);
        startTyping();
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(stopTyping, 2000);
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/login');
    };

    const openTickets = role === 'agent'
        ? tickets.filter(t => t.status === 'open')
        : [];
    const myTickets = role === 'agent'
        ? tickets.filter(t => t.status !== 'open' && t.agentId)
        : tickets;

    const statusLabel = (s) => {
        if (s === 'open') return t('open');
        if (s === 'resolved') return t('resolved');
        return t('active');
    };

    const canChat = selected && selected.status !== 'open' && selected.status !== 'resolved';

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="left">
                    <span className="app-name">{t('appName')}</span>
                    <span className={`conn-status ${isConnected ? 'connected' : ''}`}
                          title={isConnected ? 'Connected' : 'Disconnected'} />
                </div>
                <div className="right">
                    {username && <span className="user-label">{username}</span>}
                    {role && <span className="role-badge">{t(role)}</span>}
                    <button className="header-btn" onClick={() => navigate('/settings')}>
                        {t('settings')}
                    </button>
                    <button className="header-btn" onClick={handleLogout}>
                        {t('logout')}
                    </button>
                </div>
            </header>

            <div className={`dashboard-body ${selectedId ? 'ticket-selected' : ''}`}>
                <aside className="sidebar">
                    {role === 'student' && (
                        <div className="sidebar-section">
                            {showForm ? (
                                <form className="create-ticket-form" onSubmit={handleCreate}>
                                    <input
                                        placeholder={t('subject')}
                                        value={createForm.subject}
                                        onChange={e => setCreateForm(p => ({ ...p, subject: e.target.value }))}
                                        required
                                        autoFocus
                                    />
                                    
                                    <div className="urgency-selector">
                                        <label>{t('urgency')}</label>
                                        <div className="urgency-options">
                                            <div className={`u-option ${createForm.urgency === 'low' ? 'selected' : ''}`} onClick={() => setCreateForm(p => ({...p, urgency: 'low'}))}>
                                                <span className="u-dot u-low"></span> {t('lowDesc')}
                                            </div>
                                            <div className={`u-option ${createForm.urgency === 'medium' ? 'selected' : ''}`} onClick={() => setCreateForm(p => ({...p, urgency: 'medium'}))}>
                                                <span className="u-dot u-medium"></span> {t('mediumDesc')}
                                            </div>
                                            <div className={`u-option ${createForm.urgency === 'high' ? 'selected' : ''}`} onClick={() => setCreateForm(p => ({...p, urgency: 'high'}))}>
                                                <span className="u-dot u-high"></span> {t('highDesc')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button type="submit" className="submit-btn">{t('create')}</button>
                                        <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                                            {t('cancel')}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <button className="create-ticket-btn" onClick={() => setShowForm(true)}>
                                    {t('newTicket')}
                                </button>
                            )}
                        </div>
                    )}

                    {role === 'agent' && openTickets.length > 0 && (
                        <div className="sidebar-section">
                            <h3>{t('openTickets')}</h3>
                            <div className="ticket-list">
                                {openTickets.map(ticket => (
                                    <div key={ticket._id} className={`ticket-item ${selectedId === ticket._id ? 'selected' : ''}`} onClick={() => selectTicket(ticket._id)}>
                                        <div className="ticket-subject">{ticket.subject}</div>
                                        <div className="ticket-meta">
                                            <span className={`urgency-indicator ${ticket.urgency}`}>
                                                {t(ticket.urgency)}
                                            </span>
                                            <span className="status-badge open">{statusLabel(ticket.status)}</span>
                                        </div>
                                        <button className="claim-btn" onClick={(e) => { e.stopPropagation(); handleClaim(ticket._id); }}>
                                            {t('claim')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="sidebar-section">
                        <h3>{t('myTickets')}</h3>
                        <div className="ticket-list">
                            {myTickets.length === 0 && (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '8px 0' }}>
                                    {t('noTickets')}
                                </p>
                            )}
                            {myTickets.map(ticket => (
                                <div key={ticket._id} className={`ticket-item ${selectedId === ticket._id ? 'selected' : ''}`} onClick={() => selectTicket(ticket._id)}>
                                    <div className="ticket-subject">{ticket.subject}</div>
                                    <div className="ticket-meta">
                                        <span className={`urgency-indicator ${ticket.urgency}`}>
                                            {t(ticket.urgency || 'medium')}
                                        </span>
                                        <span className={`status-badge ${ticket.status}`}>
                                            {statusLabel(ticket.status)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="main-panel">
                    {!selected ? (
                        <div className="empty-state">{t('selectTicket')}</div>
                    ) : (
                        <>
                            <div className="chat-header">
                                <button className="back-btn mobile-only" onClick={() => setSelectedId(null)}>
                                    {t('backToTickets')}
                                </button>
                                <div>
                                    <span className="chat-title">{selected.subject}</span>
                                    <span className={`chat-status status-badge ${selected.status}`}>
                                        {statusLabel(selected.status)}
                                    </span>
                                </div>
                                {selected.status !== 'resolved' && role === 'agent' && (
                                    <button className="resolve-btn" onClick={handleResolve}>
                                        {t('resolve')}
                                    </button>
                                )}
                            </div>

                            <div className="messages-container" ref={containerRef}>
                                {hasMore && messages.length >= 30 && (
                                    <button className="load-more-btn" onClick={loadOlder} disabled={loadingHistory}>
                                        {loadingHistory ? '...' : t('loadOlder')}
                                    </button>
                                )}
                                {messages.map(msg => {
                                    const isImage = msg.attachment?.url?.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i);
                                    return (
                                        <div key={msg._id} className={`message-wrapper ${msg.senderUsername === username ? 'own' : 'other'}`}>
                                            <div className="message-avatar">
                                                {msg.senderAvatarUrl ? (
                                                    <img src={msg.senderAvatarUrl} alt="" className="avatar-img" />
                                                ) : (
                                                    <div className="avatar-placeholder">{msg.senderUsername.charAt(0).toUpperCase()}</div>
                                                )}
                                            </div>
                                            <div className={`message ${msg.senderUsername === username ? 'own' : 'other'}`}>
                                                {msg.senderUsername !== username && (
                                                    <div className="message-sender">{msg.senderUsername}</div>
                                                )}
                                                {msg.text && <div className="message-text">{msg.text}</div>}
                                                {msg.attachment?.url && (
                                                    <div className="message-attachment">
                                                        {isImage ? (
                                                            <img src={msg.attachment.url} alt={msg.attachment.name || t('attachment')} className="attachment-image" />
                                                        ) : (
                                                            <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer">
                                                                {msg.attachment.name || t('attachment')}
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="message-time">{formatTime(msg.createdAt)}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {remoteTyping && (
                                    <div className="typing-indicator fade-in">
                                        {remoteTyping} {t('typing')}
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {canChat && (
                                <div className="message-input-wrapper">
                                    {attachment && (
                                        <div className="attachment-preview">
                                            <span className="filename">{attachment.name}</span>
                                            <button type="button" onClick={() => setAttachment(null)}><X size={14} /></button>
                                        </div>
                                    )}
                                    
                                    <form className="message-input-area" onSubmit={handleSend}>
                                        <div className="input-pill">
                                            <button type="button" className="action-icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} title={t('attachFile')}>
                                                <Paperclip size={18} />
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                style={{ display: 'none' }} 
                                                onChange={handleFileChange}
                                            />
                                            
                                            <input
                                                value={input}
                                                onChange={handleInputChange}
                                                placeholder={uploading ? t('uploading') : t('typeMessage')}
                                                autoComplete="off"
                                                disabled={uploading}
                                                className="main-input"
                                                maxLength={2000}
                                            />

                                            <div className="emoji-container">
                                                <button type="button" className="action-icon" onClick={() => setShowEmoji(!showEmoji)} title={t('emoji')}>
                                                    <Smile size={18} />
                                                </button>
                                                {showEmoji && (
                                                    <div className="emoji-popover">
                                                        {EMOJIS.map(em => (
                                                            <span key={em} onClick={() => addEmoji(em)}>{em}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button type="submit" disabled={(!input.trim() && !attachment) || uploading} className="send-btn">
                                            {t('send')}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}