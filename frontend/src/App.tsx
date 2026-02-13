import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import './App.css';

interface Message {
  text: string;
  role: 'assistant' | 'user';
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('interviewer_message', (data: { text: string; role: 'assistant' | 'user' }) => {
      setMessages((prev) => [...prev, { text: data.text, role: data.role }]);
    });

    newSocket.on('interviewer_typing', (data: { typing: boolean }) => {
      setTyping(data.typing);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const uploadCv = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:3000/api/v1/interviews/upload', formData);
      console.log('Upload success:', response.data);
      setInterviewId(response.data.interviewId); 
      setMessages([{ text: 'CV uploaded successfully! Let\'s start the interview.', role: 'assistant' }]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload CV');
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = () => {
    if (!inputText || !socket || !interviewId) return;
    
    const userMessage: Message = { text: inputText, role: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    
    socket.emit('candidate_message', {
      interviewId,
      text: inputText,
    });
    
    setInputText('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>IntelliView AI</h1>
      </header>

      <main>
        {!interviewId ? (
          <div className="upload-section">
            <h2>Upload your CV to start</h2>
            <input type="file" accept="application/pdf" onChange={handleFileChange} />
            <button onClick={uploadCv} disabled={!file || uploading}>
              {uploading ? 'Uploading...' : 'Start Interview'}
            </button>
          </div>
        ) : (
          <div className="chat-section">
            <div className="chat-window">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <strong>{msg.role === 'assistant' ? 'Interviewer' : 'You'}:</strong> {msg.text}
                </div>
              ))}
              {typing && <div className="typing">Interviewer is typing...</div>}
            </div>
            <div className="input-area">
              <input 
                type="text" 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your answer..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
