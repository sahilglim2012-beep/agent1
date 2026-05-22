import React, { useState, useEffect } from 'react';
import { Settings, Lock, Eye, EyeOff, Save, CheckCircle, AlertCircle, X, Sparkles } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose, onSaveSuccess }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' or 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [backendConfig, setBackendConfig] = useState({
    has_gemini_key: false,
    has_openai_key: false,
    active_provider: 'gemini'
  });

  useEffect(() => {
    if (isOpen) {
      fetchBackendConfig();
    }
  }, [isOpen]);

  const fetchBackendConfig = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/config');
      if (res.ok) {
        const data = await res.json();
        setBackendConfig(data);
        setProvider(data.active_provider);
      }
    } catch (e) {
      console.error("Failed to load backend config", e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:8000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: geminiKey || undefined,
          openai_api_key: openaiKey || undefined,
          active_provider: provider
        })
      });

      if (res.ok) {
        const data = await res.json();
        setStatus('success');
        setBackendConfig({
          has_gemini_key: data.has_gemini_key,
          has_openai_key: data.has_openai_key,
          active_provider: data.active_provider
        });
        setGeminiKey('');
        setOpenaiKey('');
        if (onSaveSuccess) onSaveSuccess();
        
        // Auto close after 1.5 seconds on success
        setTimeout(() => {
          onClose();
          setStatus(null);
        }, 1500);
      } else {
        const err = await res.json();
        setStatus('error');
        setErrorMsg(err.detail || 'Failed to save configuration');
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg('Cannot connect to the backend server. Please verify it is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div className="glass-panel animate-fade-in" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Settings size={20} className="pulse-glow" style={{ color: 'hsl(var(--accent-purple))' }} />
            <h3 style={{ fontSize: '1.25rem' }}>AI Tutor Settings</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.infoBox}>
            <Lock size={16} style={{ color: 'hsl(var(--accent-blue))', flexShrink: 0 }} />
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
              Your API keys are stored locally on your machine in the backend <code>.env</code> file. They are never sent to external servers other than directly to the respective AI providers (Google/OpenAI).
            </p>
          </div>

          {/* Provider Selection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Active LLM Provider</label>
            <div style={styles.radioGroup}>
              <div 
                style={{
                  ...styles.radioCard,
                  borderColor: provider === 'gemini' ? 'hsl(var(--accent-purple))' : 'rgba(255,255,255,0.08)',
                  background: provider === 'gemini' ? 'rgba(var(--accent-purple-rgb), 0.08)' : 'rgba(255,255,255,0.02)'
                }}
                onClick={() => setProvider('gemini')}
              >
                <input 
                  type="radio" 
                  name="provider" 
                  checked={provider === 'gemini'} 
                  onChange={() => setProvider('gemini')}
                  style={{ display: 'none' }}
                />
                <Sparkles size={16} style={{ color: 'hsl(var(--accent-purple))' }} />
                <div style={styles.radioText}>
                  <div style={{ fontWeight: 600 }}>Gemini AI</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                    Google Gemini 1.5 Flash (Fast & Smart)
                  </div>
                </div>
                {backendConfig.has_gemini_key && (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Active</span>
                )}
              </div>

              <div 
                style={{
                  ...styles.radioCard,
                  borderColor: provider === 'openai' ? 'hsl(var(--accent-blue))' : 'rgba(255,255,255,0.08)',
                  background: provider === 'openai' ? 'rgba(var(--accent-blue-rgb), 0.08)' : 'rgba(255,255,255,0.02)'
                }}
                onClick={() => setProvider('openai')}
              >
                <input 
                  type="radio" 
                  name="provider" 
                  checked={provider === 'openai'} 
                  onChange={() => setProvider('openai')}
                  style={{ display: 'none' }}
                />
                <Lock size={16} style={{ color: 'hsl(var(--accent-blue))' }} />
                <div style={styles.radioText}>
                  <div style={{ fontWeight: 600 }}>OpenAI GPT</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                    OpenAI GPT-4o Mini (Extremely Analytical)
                  </div>
                </div>
                {backendConfig.has_openai_key && (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Active</span>
                )}
              </div>
            </div>
          </div>

          {/* Gemini Key Input */}
          <div style={styles.formGroup}>
            <div style={styles.inputLabelRow}>
              <label style={styles.label}>Gemini API Key</label>
              {backendConfig.has_gemini_key ? (
                <span style={styles.statusBadgeGreen}>✓ Currently Configured</span>
              ) : (
                <span style={styles.statusBadgeRed}>✗ Missing Key</span>
              )}
            </div>
            <div style={styles.inputWrapper}>
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={backendConfig.has_gemini_key ? '••••••••••••••••••••••••••••••••••••' : 'AIzaSy...'}
                style={styles.input}
              />
              <button 
                type="button" 
                style={styles.eyeBtn}
                onClick={() => setShowGemini(!showGemini)}
              >
                {showGemini ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p style={styles.inputHint}>
              Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'hsl(var(--accent-purple))' }}>Google AI Studio</a>.
            </p>
          </div>

          {/* OpenAI Key Input */}
          <div style={styles.formGroup}>
            <div style={styles.inputLabelRow}>
              <label style={styles.label}>OpenAI API Key</label>
              {backendConfig.has_openai_key ? (
                <span style={styles.statusBadgeGreen}>✓ Currently Configured</span>
              ) : (
                <span style={styles.statusBadgeRed}>✗ Missing Key</span>
              )}
            </div>
            <div style={styles.inputWrapper}>
              <input
                type={showOpenai ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={backendConfig.has_openai_key ? '••••••••••••••••••••••••••••••••••••' : 'sk-...'}
                style={styles.input}
              />
              <button 
                type="button" 
                style={styles.eyeBtn}
                onClick={() => setShowOpenai(!showOpenai)}
              >
                {showOpenai ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p style={styles.inputHint}>
              Get a key from the <a href="https://platform.openai.com/" target="_blank" rel="noreferrer" style={{ color: 'hsl(var(--accent-blue))' }}>OpenAI Dashboard</a>.
            </p>
          </div>

          {/* Feedback message */}
          {status === 'success' && (
            <div style={{ ...styles.alert, borderColor: 'hsl(var(--success))', background: 'rgba(var(--success-rgb), 0.1)' }}>
              <CheckCircle size={16} style={{ color: 'hsl(var(--success))' }} />
              <span style={{ fontSize: '0.85rem' }}>Keys saved! Activating your settings...</span>
            </div>
          )}

          {status === 'error' && (
            <div style={{ ...styles.alert, borderColor: 'hsl(var(--error))', background: 'rgba(var(--error-rgb), 0.1)' }}>
              <AlertCircle size={16} style={{ color: 'hsl(var(--error))' }} />
              <span style={{ fontSize: '0.85rem' }}>{errorMsg}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div style={styles.footer}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="neon-btn" disabled={loading} style={{ flex: 1 }}>
              <Save size={16} />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modal: {
    width: '100%',
    maxWidth: '520px',
    borderRadius: 'var(--border-radius-lg)',
    padding: '2rem',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '1rem'
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'hsl(var(--text-secondary))',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: 'white'
    }
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  infoBox: {
    display: 'flex',
    gap: '0.75rem',
    background: 'rgba(56, 189, 248, 0.05)',
    border: '1px solid rgba(56, 189, 248, 0.15)',
    borderRadius: 'var(--border-radius-sm)',
    padding: '0.75rem 1rem',
    lineHeight: '1.4'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontFamily: 'Outfit, sans-serif',
    fontWeight: '600',
    fontSize: '0.9rem',
    color: 'hsl(var(--text-primary))'
  },
  inputLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusBadgeGreen: {
    fontSize: '0.75rem',
    color: 'hsl(var(--success))',
    fontWeight: 500
  },
  statusBadgeRed: {
    fontSize: '0.75rem',
    color: 'hsl(var(--error))',
    fontWeight: 500
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.25rem'
  },
  radioCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.85rem 1rem',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  radioText: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    paddingRight: '2.5rem'
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    background: 'transparent',
    border: 'none',
    color: 'hsl(var(--text-secondary))',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem'
  },
  inputHint: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-secondary))',
    marginTop: '0.15rem'
  },
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    border: '1px solid',
    borderRadius: 'var(--border-radius-sm)',
    padding: '0.75rem 1rem'
  },
  footer: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '1.25rem'
  }
};

export default SettingsModal;
