import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext.jsx';
import { MessageSquare, Zap, Shield, Globe } from 'lucide-react';

export default function Landing() {
    const { t, language, setLanguage } = useContext(LanguageContext);

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        try {
            const stored = JSON.parse(localStorage.getItem('settings') || '{}');
            stored.language = lang;
            localStorage.setItem('settings', JSON.stringify(stored));
        } catch (e) {}
    };

    return (
        <div className="landing-page">
            <div className="landing-nav">
                <div className="logo">
                    <div className="logo-icon"><MessageSquare size={20} /></div>
                    <span>{t('appName')}</span>
                </div>
                <div className="nav-actions">
                    <div className="language-selector" style={{ display: 'flex', gap: '12px', marginRight: '16px', alignItems: 'center' }}>
                        <button onClick={() => handleLanguageChange('en')} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: language === 'en' ? 1 : 0.4, transition: 'opacity 0.2s' }} title="English">
                            <img src="https://flagcdn.com/us.svg" width="20" alt="English" style={{ borderRadius: '2px', display: 'block' }} />
                        </button>
                        <button onClick={() => handleLanguageChange('fr')} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: language === 'fr' ? 1 : 0.4, transition: 'opacity 0.2s' }} title="Français">
                            <img src="https://flagcdn.com/fr.svg" width="20" alt="Français" style={{ borderRadius: '2px', display: 'block' }} />
                        </button>
                        <button onClick={() => handleLanguageChange('de')} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: language === 'de' ? 1 : 0.4, transition: 'opacity 0.2s' }} title="Deutsch">
                            <img src="https://flagcdn.com/de.svg" width="20" alt="Deutsch" style={{ borderRadius: '2px', display: 'block' }} />
                        </button>
                    </div>
                    <Link to="/login" className="btn-ghost">{t('login')}</Link>
                    <Link to="/register" className="btn-primary">{t('register')}</Link>
                </div>
            </div>

            <main className="hero">
                <div className="hero-content">
                    <div className="badge">Real-time customer support</div>
                    <h1 className="hero-title">{t('heroTitle')}</h1>
                    <p className="hero-subtitle">{t('heroSubtitle')}</p>
                    <div className="hero-actions">
                        <Link to="/register" className="btn-primary btn-large">{t('getStarted')}</Link>
                        <Link to="/login" className="btn-secondary btn-large">{t('agentLogin')}</Link>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="glass-card mockup-card">
                        <div className="mockup-header">
                            <div className="dots"><span></span><span></span><span></span></div>
                            <div className="mockup-title">ticket:1042</div>
                        </div>
                        <div className="mockup-body">
                            <div className="mockup-msg other">I'm having trouble logging in.</div>
                            <div className="mockup-msg own">I can help with that! Let me check your account.</div>
                            <div className="mockup-typing">agent is typing...</div>
                        </div>
                    </div>
                    <div className="orb orb-1"></div>
                    <div className="orb orb-2"></div>
                </div>
            </main>

            <section className="features">
                <div className="feature-grid">
                    <div className="feature-card glass-card">
                        <div className="icon-wrapper"><Zap size={24} /></div>
                        <h3>{t('f1Title')}</h3>
                        <p>{t('f1Desc')}</p>
                    </div>
                    <div className="feature-card glass-card">
                        <div className="icon-wrapper"><Shield size={24} /></div>
                        <h3>{t('f2Title')}</h3>
                        <p>{t('f2Desc')}</p>
                    </div>
                    <div className="feature-card glass-card">
                        <div className="icon-wrapper"><Globe size={24} /></div>
                        <h3>{t('f3Title')}</h3>
                        <p>{t('f3Desc')}</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
