import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Brain, User, Sparkles } from 'lucide-react';

// Lightweight visual markdown formatter
export const formatMessageContent = (text) => {
  if (!text) return '';
  
  // Split by double newlines for paragraphs
  const paragraphs = text.split('\n\n');
  
  return paragraphs.map((para, pIdx) => {
    // Check if it is a list
    if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
      const items = para.split('\n').filter(item => item.trim());
      return (
        <ul key={pIdx} style={styles.ul}>
          {items.map((item, iIdx) => {
            const cleanItem = item.replace(/^[-*]\s+/, '');
            return <li key={iIdx} style={styles.li}>{parseInlineStyles(cleanItem)}</li>;
          })}
        </ul>
      );
    }
    
    // Check if it's a code block
    if (para.trim().startsWith('```')) {
      const codeLines = para.split('\n');
      const language = codeLines[0].replace('```', '').trim();
      const code = codeLines.slice(1, -1).join('\n');
      return (
        <pre key={pIdx} style={styles.codeBlock}>
          {language && <div style={styles.codeLang}>{language}</div>}
          <code style={styles.codeText}>{code}</code>
        </pre>
      );
    }
    
    return <p key={pIdx} style={styles.p}>{parseInlineStyles(para)}</p>;
  });
};

const parseInlineStyles = (text) => {
  // Regex for bold **text**
  const boldRegex = /\*\*(.*?)\*\*/g;
  // Regex for inline code `code`
  const codeRegex = /`(.*?)`/g;
  
  let parts = [];
  let lastIndex = 0;
  let match;
  
  // We can do a simpler replacement or parsing
  // For robustness, let's tokenize bold and code
  const tokens = [];
  let workingText = text;
  
  // Replace bold tokens with placeholders
  workingText = workingText.replace(boldRegex, (m, p1) => {
    const id = `__BOLD_${tokens.length}__`;
    tokens.push({ id, type: 'bold', content: p1 });
    return id;
  });
  
  // Replace code tokens with placeholders
  workingText = workingText.replace(codeRegex, (m, p1) => {
    const id = `__CODE_${tokens.length}__`;
    tokens.push({ id, type: 'code', content: p1 });
    return id;
  });
  
  // Split text by placeholder IDs
  const partsArray = workingText.split(/(__[A-Z]+_\d+__)/);
  
  return partsArray.map((part, idx) => {
    const token = tokens.find(t => t.id === part);
    if (token) {
      if (token.type === 'bold') {
        return <strong key={idx} style={{ color: '#fff', fontWeight: '700' }}>{token.content}</strong>;
      }
      if (token.type === 'code') {
        return <code key={idx} style={styles.inlineCode}>{token.content}</code>;
      }
    }
    return part;
  });
};

const QUICK_PROMPTS = [
  'Can you explain this simpler?',
  'Give me a real-world analogy.',
  'Show me a practical code/math example.'
];

const ChatArea = ({ session, chatHistory, onSendMessage, onBackToDashboard, aiTyping }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, aiTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || aiTyping) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleQuickPrompt = (promptText) => {
    if (aiTyping) return;
    onSendMessage(promptText);
  };

  return (
    <div className="glass-panel animate-fade-in" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBackToDashboard}>
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>
        <div style={styles.headerTitle}>
          <div style={styles.topicName}>{session.topic}</div>
          <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
            {session.level}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messageList}>
        {chatHistory.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={idx} 
              style={{
                ...styles.messageRow,
                justifyContent: isUser ? 'flex-end' : 'flex-start'
              }}
            >
              {!isUser && (
                <div style={{ ...styles.avatar, background: 'rgba(var(--accent-purple-rgb), 0.15)', borderColor: 'rgba(var(--accent-purple-rgb), 0.3)' }}>
                  <Brain size={14} style={{ color: 'hsl(var(--accent-purple))' }} />
                </div>
              )}
              
              <div 
                style={{
                  ...styles.messageBubble,
                  background: isUser 
                    ? 'linear-gradient(135deg, rgba(var(--accent-purple-rgb), 0.8) 0%, rgba(var(--accent-blue-rgb), 0.8) 100%)' 
                    : 'rgba(255, 255, 255, 0.04)',
                  borderColor: isUser ? 'transparent' : 'rgba(255, 255, 255, 0.06)',
                  borderBottomRightRadius: isUser ? '4px' : '16px',
                  borderBottomLeftRadius: isUser ? '16px' : '4px',
                  boxShadow: isUser ? '0 4px 12px rgba(var(--accent-purple-rgb), 0.15)' : 'none'
                }}
              >
                <div style={styles.msgText}>
                  {isUser ? msg.content : formatMessageContent(msg.content)}
                </div>
              </div>

              {isUser && (
                <div style={{ ...styles.avatar, background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <User size={14} style={{ color: 'hsl(var(--text-secondary))' }} />
                </div>
              )}
            </div>
          );
        })}

        {/* AI Typing State */}
        {aiTyping && (
          <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
            <div style={{ ...styles.avatar, background: 'rgba(var(--accent-purple-rgb), 0.15)', borderColor: 'rgba(var(--accent-purple-rgb), 0.3)' }}>
              <Brain size={14} style={{ color: 'hsl(var(--accent-purple))' }} className="pulse-glow" />
            </div>
            <div style={{ ...styles.messageBubble, background: 'rgba(255, 255, 255, 0.04)', borderBottomLeftRadius: '4px' }}>
              <div style={styles.typingIndicator}>
                <span style={styles.dot}></span>
                <span style={{ ...styles.dot, animationDelay: '0.2s' }}></span>
                <span style={{ ...styles.dot, animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer Area */}
      <div style={styles.footer}>
        {/* Quick Prompts */}
        <div style={styles.quickPromptsRow}>
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              style={styles.quickPromptBtn}
              onClick={() => handleQuickPrompt(p)}
              disabled={aiTyping}
            >
              <Sparkles size={10} style={{ color: 'hsl(var(--accent-blue))' }} />
              <span>{p}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} style={styles.inputForm}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={aiTyping ? 'Study Buddy is typing...' : 'Ask your Study Buddy anything...'}
            disabled={aiTyping}
            style={styles.textInput}
          />
          <button 
            type="submit" 
            className="neon-btn" 
            style={styles.sendBtn}
            disabled={!input.trim() || aiTyping}
          >
            <Send size={14} />
          </button>
        </form>
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
    background: 'rgba(10, 14, 23, 0.4)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(255, 255, 255, 0.01)'
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'hsl(var(--text-secondary))',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    ':hover': {
      color: 'white'
    }
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  topicName: {
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 700,
    fontSize: '0.95rem',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  messageList: {
    flex: 1,
    padding: '1.25rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.75rem',
    maxWidth: '85%'
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  messageBubble: {
    padding: '0.85rem 1.1rem',
    borderRadius: '16px',
    border: '1px solid',
    color: 'hsl(var(--text-primary))',
    lineHeight: '1.5',
    fontSize: '0.9rem'
  },
  msgText: {
    wordBreak: 'break-word'
  },
  p: {
    marginBottom: '0.5rem',
    ':last-child': { marginBottom: 0 }
  },
  ul: {
    paddingLeft: '1.25rem',
    marginBottom: '0.5rem'
  },
  li: {
    marginBottom: '0.25rem'
  },
  codeBlock: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--border-radius-sm)',
    padding: '0.75rem',
    overflowX: 'auto',
    margin: '0.75rem 0',
    fontFamily: 'monospace'
  },
  codeLang: {
    fontSize: '0.7rem',
    color: 'hsl(var(--accent-purple))',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: '0.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '0.25rem'
  },
  codeText: {
    color: '#e2e8f0',
    fontSize: '0.85rem'
  },
  inlineCode: {
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '0.1rem 0.3rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    color: 'hsl(var(--accent-blue))'
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0'
  },
  dot: {
    width: '6px',
    height: '6px',
    background: 'hsl(var(--text-secondary))',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pulse 1.4s infinite ease-in-out both'
  },
  footer: {
    padding: '1rem 1.25rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  quickPromptsRow: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    paddingBottom: '0.25rem'
  },
  quickPromptBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '50px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem',
    color: 'hsl(var(--text-secondary))',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    transition: 'all 0.2s ease',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.06)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      color: 'white'
    }
  },
  inputForm: {
    display: 'flex',
    gap: '0.75rem'
  },
  textInput: {
    flex: 1,
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--border-radius-md)',
    color: '#fff',
    padding: '0.8rem 1rem',
    outline: 'none',
    fontSize: '0.95rem'
  },
  sendBtn: {
    padding: '0.8rem',
    borderRadius: 'var(--border-radius-md)',
    width: '42px',
    height: '42px',
    flexShrink: 0
  }
};

// Add standard keyframe for bouncing dots
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    @keyframes pulse {
      0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ChatArea;
