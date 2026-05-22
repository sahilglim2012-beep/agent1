import React, { useState, useEffect } from 'react';
import { Sparkles, Settings, BookOpen, Brain, Loader2, RefreshCw } from 'lucide-react';
import Onboarding from './components/Onboarding';
import ChatArea from './components/ChatArea';
import StudyDashboard from './components/StudyDashboard';
import SettingsModal from './components/SettingsModal';

function App() {
  const [hasKeys, setHasKeys] = useState(false);
  const [activeSession, setActiveSession] = useState(null); // { session_id, topic, level }
  const [chatHistory, setChatHistory] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [gradedResults, setGradedResults] = useState(null);
  const [overallScore, setOverallScore] = useState(0);
  const [activeTab, setActiveTab] = useState('explanation');
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [backendError, setBackendError] = useState('');

  useEffect(() => {
    checkBackendKeys();
  }, []);

  const checkBackendKeys = async () => {
    try {
      setBackendError('');
      const res = await fetch('http://localhost:8000/api/config');
      if (res.ok) {
        const data = await res.json();
        setHasKeys(data.has_gemini_key || data.has_openai_key);
      } else {
        setBackendError('Backend returned an error. Please verify the API is running correctly.');
      }
    } catch (e) {
      setBackendError('Cannot connect to Python FastAPI backend. Please run the backend server first.');
    }
  };

  const handleStartSession = async (topic, level) => {
    setSessionLoading(true);
    setLoadingStep('Initializing AI Study Buddy...');
    
    // Simulate beautiful progressive loading steps
    const steps = [
      'Detecting topic depth and learning level...',
      'Mapping key concepts and outline structure...',
      'Generating tailored explanation and study guide...',
      'Generating structured interactive practice quiz...',
      'Finalizing study room...'
    ];
    
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setLoadingStep(steps[stepIdx]);
      }
    }, 2500);

    try {
      const res = await fetch('http://localhost:8000/api/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level })
      });

      clearInterval(interval);

      if (res.ok) {
        const data = await res.json();
        setActiveSession({
          session_id: data.session_id,
          topic: data.topic,
          level: data.level
        });
        setExplanation(data.explanation);
        setQuiz(data.quiz);
        setChatHistory(data.chat_history);
        setGradedResults(null);
        setOverallScore(0);
        setActiveTab('explanation');
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to initialize study session. Please try again.');
      }
    } catch (e) {
      clearInterval(interval);
      alert('Error connecting to backend server. Make sure the FastAPI server is running on http://localhost:8000.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleRestoreSession = async (sessionId) => {
    setSessionLoading(true);
    setLoadingStep('Restoring your study room...');
    try {
      const res = await fetch(`http://localhost:8000/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSession({
          session_id: data.session_id,
          topic: data.topic,
          level: data.level
        });
        setExplanation(data.explanation);
        setQuiz(data.quiz);
        setChatHistory(data.chat_history);
        
        // If already graded, reconstruct
        if (data.score !== null) {
          setOverallScore(data.score);
          // Fetch graded results
          // In a simple system we could grade again or we stored it in the chat message
          // Let's grade locally if we have it, or fetch. For simplicity, we can let them see their previous chats,
          // and they can retake the quiz. Let's reset gradedResults so they can take it or see it.
          setGradedResults(null); 
        } else {
          setGradedResults(null);
          setOverallScore(0);
        }
        
        setActiveTab('explanation');
      } else {
        alert('Failed to restore study session.');
      }
    } catch (e) {
      alert('Error connecting to backend server.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!activeSession) return;
    
    // Add user message immediately to the UI
    const newUserMsg = { role: 'user', content: messageText };
    setChatHistory(prev => [...prev, newUserMsg]);
    setAiTyping(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.session_id,
          message: messageText
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        const err = await res.json();
        setChatHistory(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err.detail || 'Could not fetch response.'}` }]);
      }
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: '⚠️ Server connection lost. Please check if the backend is running.' }]);
    } finally {
      setAiTyping(false);
    }
  };

  const handleSubmitQuiz = async (answers) => {
    if (!activeSession) return;
    
    if (answers === null) {
      // Retaking quiz
      setGradedResults(null);
      setOverallScore(0);
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/grade-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.session_id,
          answers
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGradedResults(data.results);
        setOverallScore(data.score);
        setChatHistory(data.chat_history); // Sync graded notice in chat
      } else {
        alert('Failed to grade quiz.');
      }
    } catch (e) {
      alert('Error connecting to grading service.');
    }
  };

  const handleBackToDashboard = () => {
    setActiveSession(null);
    setExplanation('');
    setQuiz(null);
    setGradedResults(null);
    setChatHistory([]);
  };

  return (
    <div style={styles.appContainer}>
      {/* Top Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navLogo} onClick={handleBackToDashboard}>
          <Brain size={24} style={{ color: 'hsl(var(--accent-purple))' }} className="pulse-glow" />
          <span style={styles.logoText}>StudyBuddy<span style={{ color: 'hsl(var(--accent-blue))' }}>.ai</span></span>
        </div>

        <div style={styles.navActions}>
          {backendError && (
            <div style={styles.errorBanner}>
              <span>⚠️ Backend Offline</span>
              <button onClick={checkBackendKeys} style={styles.retryBtn}>
                <RefreshCw size={12} />
              </button>
            </div>
          )}
          
          <button className="btn-secondary" style={styles.settingsBtn} onClick={() => setSettingsOpen(true)}>
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={styles.main}>
        {activeSession ? (
          // Dual Pane Learning Environment
          <div style={styles.studyLayout}>
            <div style={styles.leftPane}>
              <ChatArea
                session={activeSession}
                chatHistory={chatHistory}
                onSendMessage={handleSendMessage}
                onBackToDashboard={handleBackToDashboard}
                aiTyping={aiTyping}
              />
            </div>
            <div style={styles.rightPane}>
              <StudyDashboard
                explanation={explanation}
                quiz={quiz}
                onSubmitAnswers={handleSubmitQuiz}
                gradedResults={gradedResults}
                overallScore={overallScore}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>
          </div>
        ) : (
          // Dashboard / Selection Flow
          <Onboarding
            onStartSession={handleStartSession}
            onRestoreSession={handleRestoreSession}
            openSettings={() => setSettingsOpen(true)}
            hasKeys={hasKeys}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaveSuccess={checkBackendKeys}
      />

      {/* Stunning Progressive Loading Overlay */}
      {sessionLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingCard}>
            <div style={styles.brainWrapper}>
              <Brain size={48} className="pulse-glow" style={styles.loadingBrain} />
              <Loader2 size={72} style={styles.loadingSpinner} />
            </div>
            <h3 style={styles.loadingTitle}>Preparing Study Room</h3>
            <p style={styles.loadingSubtitle}>{loadingStep}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 2.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(10, 14, 23, 0.3)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer'
  },
  logoText: {
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 800,
    fontSize: '1.35rem',
    letterSpacing: '-0.02em',
    color: '#fff'
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '0.4rem 0.8rem',
    borderRadius: 'var(--border-radius-sm)',
    color: 'hsl(var(--error))',
    fontSize: '0.8rem',
    fontWeight: 600
  },
  retryBtn: {
    background: 'transparent',
    border: 'none',
    color: 'hsl(var(--error))',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '0.1rem',
    borderRadius: '4px',
    ':hover': {
      background: 'rgba(239, 68, 68, 0.1)'
    }
  },
  settingsBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem'
  },
  main: {
    flex: 1,
    padding: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  studyLayout: {
    display: 'grid',
    gridTemplateColumns: '0.9fr 1.1fr',
    gap: '2rem',
    width: '100%',
    maxWidth: '1440px',
    height: 'calc(100vh - 160px)',
    margin: '0 auto'
  },
  leftPane: {
    height: '100%',
    overflow: 'hidden'
  },
  rightPane: {
    height: '100%',
    overflow: 'hidden'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 12, 0.85)',
    backdropFilter: 'blur(16px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  },
  loadingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '1.25rem',
    maxWidth: '360px',
    padding: '2rem'
  },
  brainWrapper: {
    position: 'relative',
    width: '90px',
    height: '90px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingBrain: {
    color: 'hsl(var(--accent-purple))',
    position: 'absolute'
  },
  loadingSpinner: {
    color: 'hsl(var(--accent-blue))',
    animation: 'spin 2s linear infinite'
  },
  loadingTitle: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '1.5rem',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #fff 0%, hsl(var(--text-secondary)) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  loadingSubtitle: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-secondary))',
    height: '20px',
    transition: 'all 0.3s ease'
  }
};

// Add standard keyframe for spinning spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default App;
