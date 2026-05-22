import React, { useState } from 'react';
import { BookOpen, CheckSquare, Award, ArrowRight, Check, X, HelpCircle, Sparkles, Trophy } from 'lucide-react';
import { formatMessageContent } from './ChatArea'; // Re-use our beautiful markdown renderer!

const StudyDashboard = ({ explanation, quiz, onSubmitAnswers, gradedResults, overallScore, activeTab, setActiveTab }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({}); // Maps question.id (int) -> selected option index (int)
  const [submitting, setSubmitting] = useState(false);

  const handleSelectOption = (questionId, optionIdx) => {
    if (gradedResults) return; // Can't change after grading
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  const handleSubmit = async () => {
    const questions = quiz?.questions || [];
    if (Object.keys(selectedAnswers).length < questions.length) {
      alert("Please answer all questions before submitting!");
      return;
    }
    setSubmitting(true);
    // Convert keys to string to match API requirements
    const answersPayload = {};
    Object.entries(selectedAnswers).forEach(([k, v]) => {
      answersPayload[k] = v;
    });
    await onSubmitAnswers(answersPayload);
    setSubmitting(false);
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    // We can clear graded results in parent
    onSubmitAnswers(null); 
  };

  const getBadgeTier = (score) => {
    if (score === 100) return { title: 'Grandmaster 🎓', color: 'hsl(var(--success))', desc: '100% Correct - Flawless Mastery!' };
    if (score >= 66) return { title: 'Scholar 📚', color: 'hsl(var(--accent-blue))', desc: 'Pass - Excellent understanding!' };
    return { title: 'Apprentice 💡', color: 'hsl(var(--warning))', desc: 'Study more and try again!' };
  };

  const questions = quiz?.questions || [];
  const isQuizComplete = Object.keys(selectedAnswers).length === questions.length;

  return (
    <div className="glass-panel animate-fade-in" style={styles.container}>
      {/* Tabs Header */}
      <div style={styles.tabsRow}>
        <button
          style={{
            ...styles.tabBtn,
            borderBottomColor: activeTab === 'explanation' ? 'hsl(var(--accent-purple))' : 'transparent',
            color: activeTab === 'explanation' ? 'white' : 'hsl(var(--text-secondary))'
          }}
          onClick={() => setActiveTab('explanation')}
        >
          <BookOpen size={16} />
          <span>Study Guide</span>
        </button>

        <button
          style={{
            ...styles.tabBtn,
            borderBottomColor: activeTab === 'quiz' ? 'hsl(var(--accent-purple))' : 'transparent',
            color: activeTab === 'quiz' ? 'white' : 'hsl(var(--text-secondary))'
          }}
          onClick={() => setActiveTab('quiz')}
        >
          <CheckSquare size={16} />
          <span>Practice Quiz</span>
          {gradedResults && (
            <span style={styles.tabBadgeScore}>{overallScore}%</span>
          )}
        </button>

        <button
          style={{
            ...styles.tabBtn,
            borderBottomColor: activeTab === 'progress' ? 'hsl(var(--accent-purple))' : 'transparent',
            color: activeTab === 'progress' ? 'white' : 'hsl(var(--text-secondary))'
          }}
          onClick={() => setActiveTab('progress')}
        >
          <Award size={16} />
          <span>Your Stats</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div style={styles.contentBody}>
        {/* Explanation Tab */}
        {activeTab === 'explanation' && (
          <div style={styles.explanationTab} className="animate-fade-in">
            {formatMessageContent(explanation)}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div style={styles.quizTab} className="animate-fade-in">
            {/* Header / Score Summary */}
            {gradedResults ? (
              <div className="glass-card" style={styles.scoreSummaryCard}>
                <Trophy size={36} style={{ color: 'gold' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Practice Quiz Graded!</h3>
                  <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                    You scored <strong>{overallScore}%</strong>. Look below to review explanations.
                  </p>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span 
                      className="badge" 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        borderColor: getBadgeTier(overallScore).color,
                        color: getBadgeTier(overallScore).color 
                      }}
                    >
                      {getBadgeTier(overallScore).title}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                      {getBadgeTier(overallScore).desc}
                    </span>
                  </div>
                </div>
                <button className="btn-secondary" onClick={handleRetake} style={{ alignSelf: 'center' }}>
                  Retake Quiz
                </button>
              </div>
            ) : (
              <div style={styles.quizIntro}>
                <Sparkles size={16} style={{ color: 'hsl(var(--accent-blue))' }} />
                <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                  Ready to test your knowledge? Answer these 3 custom questions based on the guide.
                </span>
              </div>
            )}

            {/* Questions List */}
            <div style={styles.questionsList}>
              {questions.map((q, idx) => {
                const questionId = q.id;
                const selectedIdx = selectedAnswers[questionId];
                const gradedQ = gradedResults?.find(gr => gr.id === questionId);
                
                return (
                  <div key={questionId} className="glass-card" style={styles.questionCard}>
                    <div style={styles.questionHeader}>
                      <span style={styles.questionNum}>Q{idx + 1}</span>
                      <h4 style={styles.questionTitle}>{q.question}</h4>
                    </div>

                    <div style={styles.optionsList}>
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedIdx === optIdx;
                        
                        // Style states
                        let borderStyle = 'rgba(255,255,255,0.06)';
                        let bgStyle = 'rgba(255,255,255,0.02)';
                        let iconElement = null;

                        if (gradedQ) {
                          const isCorrectOpt = optIdx === gradedQ.correct_option_index;
                          const isWrongSelection = isSelected && !gradedQ.is_correct;

                          if (isCorrectOpt) {
                            borderStyle = 'rgba(var(--success-rgb), 0.5)';
                            bgStyle = 'rgba(var(--success-rgb), 0.08)';
                            iconElement = <Check size={14} style={{ color: 'hsl(var(--success))', marginLeft: 'auto' }} />;
                          } else if (isWrongSelection) {
                            borderStyle = 'rgba(var(--error-rgb), 0.5)';
                            bgStyle = 'rgba(var(--error-rgb), 0.08)';
                            iconElement = <X size={14} style={{ color: 'hsl(var(--error))', marginLeft: 'auto' }} />;
                          }
                        } else if (isSelected) {
                          borderStyle = 'hsl(var(--accent-purple))';
                          bgStyle = 'rgba(var(--accent-purple-rgb), 0.08)';
                        }

                        return (
                          <div
                            key={optIdx}
                            style={{
                              ...styles.optionRow,
                              borderColor: borderStyle,
                              background: bgStyle,
                              cursor: gradedResults ? 'default' : 'pointer'
                            }}
                            onClick={() => handleSelectOption(questionId, optIdx)}
                          >
                            <span 
                              style={{ 
                                ...styles.optionBullet,
                                background: isSelected ? 'hsl(var(--accent-purple))' : 'rgba(255,255,255,0.1)',
                                color: isSelected ? '#fff' : 'hsl(var(--text-secondary))'
                              }}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span style={styles.optionText}>{opt}</span>
                            {iconElement}
                          </div>
                        );
                      })}
                    </div>

                    {/* Hint if not graded and user wants it */}
                    {!gradedResults && q.hint && (
                      <details style={styles.hintDetails}>
                        <summary style={styles.hintSummary}>
                          <HelpCircle size={12} />
                          <span>Need a Hint?</span>
                        </summary>
                        <p style={styles.hintText}>{q.hint}</p>
                      </details>
                    )}

                    {/* Graded explanation */}
                    {gradedQ && (
                      <div style={styles.gradedExplanation}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: gradedQ.is_correct ? 'hsl(var(--success))' : 'hsl(var(--error))', marginBottom: '0.25rem' }}>
                          {gradedQ.is_correct ? 'Correct!' : 'Incorrect.'} Explanation:
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                          {gradedQ.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            {!gradedResults && (
              <button
                className="neon-btn pulse-glow"
                style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
                disabled={!isQuizComplete || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Grading...' : 'Submit Answers'}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div style={styles.progressTab} className="animate-fade-in">
            <h3 style={styles.sectionHeader}>Study Summary</h3>
            <div style={styles.statsGrid}>
              <div className="glass-card" style={styles.statCard}>
                <span style={styles.statLabel}>Topic Mastered</span>
                <span style={styles.statValue}>{quiz?.topic || 'N/A'}</span>
              </div>

              <div className="glass-card" style={styles.statCard}>
                <span style={styles.statLabel}>Difficulty level</span>
                <span style={styles.statValue}>{quiz?.difficulty || 'N/A'}</span>
              </div>

              <div className="glass-card" style={styles.statCard}>
                <span style={styles.statLabel}>Quiz Score</span>
                <span style={{ ...styles.statValue, color: gradedResults ? getBadgeTier(overallScore).color : 'hsl(var(--text-muted))' }}>
                  {gradedResults ? `${overallScore}%` : 'Not Taken'}
                </span>
              </div>

              <div className="glass-card" style={styles.statCard}>
                <span style={styles.statLabel}>Tutor Mastery Badge</span>
                <span style={{ ...styles.statValue, fontSize: '1rem', marginTop: '0.25rem' }}>
                  {gradedResults ? getBadgeTier(overallScore).title : 'Apprentice 💡'}
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Your Study Path</h4>
              <div style={styles.pathList}>
                <div style={styles.pathItem}>
                  <div style={styles.pathIndicatorGreen}>✓</div>
                  <div style={styles.pathText}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Generated Study Guide</div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Tutor created standard {quiz?.difficulty} study content.</div>
                  </div>
                </div>

                <div style={styles.pathItem}>
                  <div style={gradedResults ? styles.pathIndicatorGreen : styles.pathIndicatorActive}>
                    {gradedResults ? '✓' : '2'}
                  </div>
                  <div style={styles.pathText}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Take Practice Quiz</div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Take a 3-question MCQ to validate key concepts.</div>
                  </div>
                </div>

                <div style={styles.pathItem}>
                  <div style={gradedResults ? styles.pathIndicatorActive : styles.pathIndicatorInactive}>3</div>
                  <div style={styles.pathText}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>General Chat Session</div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Ask follow-up questions to clarify edge cases.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--border-radius-lg)',
    background: 'rgba(10, 14, 23, 0.3)'
  },
  tabsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr 1fr',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(0, 0, 0, 0.15)'
  },
  tabBtn: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '1rem 0.5rem',
    color: 'hsl(var(--text-secondary))',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 600,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease',
    ':hover': {
      color: '#fff',
      background: 'rgba(255,255,255,0.02)'
    }
  },
  tabBadgeScore: {
    background: 'rgba(var(--accent-purple-rgb), 0.15)',
    border: '1px solid rgba(var(--accent-purple-rgb), 0.3)',
    color: 'hsl(var(--accent-purple))',
    padding: '0.05rem 0.35rem',
    borderRadius: '50px',
    fontSize: '0.7rem',
    fontWeight: '700'
  },
  contentBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem'
  },
  explanationTab: {
    lineHeight: '1.7',
    fontSize: '0.95rem',
    color: 'hsl(var(--text-secondary))',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  quizTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  quizIntro: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(56, 189, 248, 0.04)',
    border: '1px solid rgba(56, 189, 248, 0.1)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-sm)'
  },
  scoreSummaryCard: {
    display: 'flex',
    gap: '1.25rem',
    padding: '1.25rem',
    borderRadius: 'var(--border-radius-md)',
    background: 'rgba(34, 197, 94, 0.05)',
    border: '1px solid rgba(34, 197, 94, 0.15)',
    marginBottom: '0.25rem'
  },
  questionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  questionCard: {
    padding: '1.25rem'
  },
  questionHeader: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    marginBottom: '1rem'
  },
  questionNum: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'hsl(var(--accent-purple))',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 700,
    fontSize: '0.75rem',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    marginTop: '0.15rem'
  },
  questionTitle: {
    fontSize: '0.95rem',
    lineHeight: '1.4',
    fontWeight: 650,
    color: '#fff'
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem'
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid',
    transition: 'all 0.15s ease'
  },
  optionBullet: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    flexShrink: 0
  },
  optionText: {
    fontSize: '0.85rem',
    lineHeight: '1.3'
  },
  hintDetails: {
    marginTop: '0.85rem',
    cursor: 'pointer'
  },
  hintSummary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.75rem',
    color: 'hsl(var(--text-muted))',
    fontWeight: 600,
    userSelect: 'none',
    ':hover': {
      color: 'hsl(var(--accent-blue))'
    }
  },
  hintText: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-secondary))',
    marginTop: '0.35rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(0,0,0,0.15)',
    borderLeft: '2px solid hsl(var(--accent-blue))',
    borderRadius: '0 4px 4px 0',
    lineHeight: '1.4'
  },
  gradedExplanation: {
    marginTop: '1rem',
    paddingTop: '0.85rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
  },
  progressTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  sectionHeader: {
    fontSize: '1.1rem',
    fontWeight: 600,
    fontFamily: 'Outfit, sans-serif'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem'
  },
  statCard: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-secondary))',
    marginBottom: '0.25rem'
  },
  statValue: {
    fontSize: '1.1rem',
    fontWeight: '750',
    fontFamily: 'Outfit, sans-serif',
    lineHeight: '1.2',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  pathList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  pathItem: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center'
  },
  pathIndicatorGreen: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: 'hsl(var(--success))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    flexShrink: 0
  },
  pathIndicatorActive: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(var(--accent-purple-rgb), 0.1)',
    border: '1px solid hsl(var(--accent-purple))',
    color: 'hsl(var(--accent-purple))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    flexShrink: 0,
    boxShadow: '0 0 10px rgba(var(--accent-purple-rgb), 0.2)'
  },
  pathIndicatorInactive: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'hsl(var(--text-muted))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    flexShrink: 0
  },
  pathText: {
    display: 'flex',
    flexDirection: 'column'
  }
};

export default StudyDashboard;
