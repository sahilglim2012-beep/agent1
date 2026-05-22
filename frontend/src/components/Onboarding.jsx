import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Brain, Award, Play, History, ArrowRight, Settings } from 'lucide-react';

const SUGGESTIONS = [
  { topic: 'Photosynthesis', icon: '🌱', category: 'Biology' },
  { topic: 'Quantum Physics', icon: '⚛️', category: 'Physics' },
  { topic: 'Neural Networks', icon: '🧠', category: 'Tech' },
  { topic: 'French Revolution', icon: '🏰', category: 'History' },
  { topic: 'Organic Chemistry', icon: '🧪', category: 'Chemistry' }
];

const Onboarding = ({ onStartSession, onRestoreSession, openSettings, hasKeys }) => {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Intermediate');
  const [recentSessions, setRecentSessions] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    fetchRecentSessions();
  }, []);

  const fetchRecentSessions = async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch('http://localhost:8000/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setRecentSessions(data.slice(0, 4)); // Show top 4 recent
      }
    } catch (e) {
      console.error("Failed to load recent sessions", e);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onStartSession(topic.trim(), level);
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.leftCol}>
        <div style={styles.heroSection}>
          <div className="badge badge-purple" style={{ marginBottom: '1rem' }}>
            <Sparkles size={12} style={{ marginRight: '0.25rem' }} />
            Meet your ultimate Study Buddy
          </div>
          <h1 style={styles.heroTitle}>
            Master Any Topic <br />
            <span style={styles.gradientText}>Explained Simply.</span>
          </h1>
          <p style={styles.heroSubtitle}>
            An intelligent, memory-backed tutor that adapts to your learning level, creates detailed summaries, and tests your knowledge with interactive, custom-graded quizzes.
          </p>
        </div>

        {/* Suggestion Chips */}
        <div style={styles.suggestionsContainer}>
          <p style={styles.suggestionTitle}>Need ideas? Try one of these:</p>
          <div style={styles.chipsRow}>
            {SUGGESTIONS.map((s, idx) => (
              <button 
                key={idx}
                className="btn-secondary" 
                style={styles.suggestionChip}
                onClick={() => setTopic(s.topic)}
              >
                <span>{s.icon}</span>
                <span>{s.topic}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="glass-panel" style={styles.formPanel}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <BookOpen size={16} style={{ color: 'hsl(var(--accent-purple))' }} />
                What topic do you want to learn today?
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter anything: 'Photosynthesis', 'Black Holes', 'Python Decorators'..."
                style={styles.input}
                required
              />
            </div>

            {/* Level Selector */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Award size={16} style={{ color: 'hsl(var(--accent-blue))' }} />
                Choose your difficulty level
              </label>
              <div style={styles.levelRow}>
                {[
                  { name: 'Beginner', desc: 'Analogy-rich, simple terms', icon: '🍼' },
                  { name: 'Intermediate', desc: 'Standard details & examples', icon: '📚' },
                  { name: 'Advanced', desc: 'Deep dive, academic rigor', icon: '🎓' }
                ].map((l) => (
                  <div
                    key={l.name}
                    style={{
                      ...styles.levelCard,
                      borderColor: level === l.name ? 'hsl(var(--accent-purple))' : 'rgba(255,255,255,0.06)',
                      background: level === l.name ? 'rgba(var(--accent-purple-rgb), 0.08)' : 'rgba(255,255,255,0.015)'
                    }}
                    onClick={() => setLevel(l.name)}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{l.icon}</span>
                    <div style={styles.levelCardMeta}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{l.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))' }}>{l.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* API Warning if missing */}
            {!hasKeys && (
              <div style={styles.keyAlert}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem' }}>🔑</span>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>API Keys Needed</div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
                  You need to configure your Gemini or OpenAI API key to start studying. Click below to open Settings.
                </p>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ ...styles.inlineSettingsBtn, padding: '0.4rem 0.8rem', marginTop: '0.5rem', fontSize: '0.75rem' }}
                  onClick={openSettings}
                >
                  <Settings size={12} />
                  Configure Keys
                </button>
              </div>
            )}

            <button type="submit" className="neon-btn pulse-glow" disabled={!topic || !hasKeys} style={styles.startBtn}>
              <Play size={16} />
              Start Studying
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Recent Sessions */}
      <div style={styles.rightCol}>
        <div style={styles.recentTitleRow}>
          <History size={18} style={{ color: 'hsl(var(--text-secondary))' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Resume Studying</h3>
        </div>

        {recentSessions.length === 0 ? (
          <div className="glass-panel" style={styles.emptyRecent}>
            <Brain size={32} style={{ color: 'hsl(var(--text-muted))', marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
              Your past learning sessions will show up here. Start your first topic to build your library!
            </p>
          </div>
        ) : (
          <div style={styles.recentList}>
            {recentSessions.map((session) => (
              <div 
                key={session.session_id} 
                className="glass-card animate-fade-in" 
                style={styles.recentCard}
                onClick={() => onRestoreSession(session.session_id)}
              >
                <div style={styles.recentCardMeta}>
                  <h4 style={styles.recentTopic}>{session.topic}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                      {session.level}
                    </span>
                    {session.score !== null && (
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                        Quiz: {session.score}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={styles.recentArrow}>
                  <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 0.7fr',
    gap: '2.5rem',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    alignItems: 'start',
    padding: '1rem 0'
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  heroSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  heroTitle: {
    fontSize: '2.75rem',
    lineHeight: '1.2',
    marginBottom: '1rem',
    fontFamily: 'Outfit, sans-serif'
  },
  gradientText: {
    background: 'linear-gradient(135deg, hsl(var(--accent-purple)) 0%, hsl(var(--accent-blue)) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: '800'
  },
  heroSubtitle: {
    fontSize: '1rem',
    color: 'hsl(var(--text-secondary))',
    lineHeight: '1.6',
    maxWidth: '560px'
  },
  suggestionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  suggestionTitle: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-secondary))',
    fontWeight: 500
  },
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem'
  },
  suggestionChip: {
    padding: '0.4rem 0.9rem',
    borderRadius: '50px',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem'
  },
  formPanel: {
    padding: '2rem',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: '600',
    fontSize: '0.95rem'
  },
  input: {
    width: '100%',
    padding: '0.9rem 1.2rem',
    fontSize: '1rem',
    borderRadius: 'var(--border-radius-md)'
  },
  levelRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '0.75rem'
  },
  levelCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem 0.5rem',
    borderRadius: 'var(--border-radius-md)',
    border: '1px solid',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    gap: '0.4rem'
  },
  levelCardMeta: {
    display: 'flex',
    flexDirection: 'column'
  },
  keyAlert: {
    background: 'rgba(239, 68, 68, 0.04)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: 'var(--border-radius-md)',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  inlineSettingsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem'
  },
  startBtn: {
    padding: '1rem',
    fontSize: '1.1rem',
    width: '100%',
    marginTop: '0.5rem'
  },
  recentTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem'
  },
  emptyRecent: {
    padding: '2.5rem 1.5rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  recentCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    borderRadius: 'var(--border-radius-md)'
  },
  recentCardMeta: {
    display: 'flex',
    flexDirection: 'column'
  },
  recentTopic: {
    fontSize: '0.95rem',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '220px'
  },
  recentArrow: {
    color: 'hsl(var(--text-muted))',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '.recentCard:hover &': {
      color: 'hsl(var(--accent-purple))',
      transform: 'translateX(3px)'
    }
  }
};

export default Onboarding;
