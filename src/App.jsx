import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  ShieldAlert, 
  Zap, 
  Server, 
  Activity, 
  Settings, 
  AlertTriangle,
  Info
} from 'lucide-react';

// API Configuration
const apiKey = "AIzaSyDrMbZ3YnZfzasKzCd41W4CVlJ6bSEj5uI"; // Environment provides the key at runtime
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

// The strict persona instructions based on your prompt
const systemInstruction = `
Role and Identity
You are the "IOCL RCP Station Expert," an advanced AI assistant specializing in electrical, mechanical, and instrumentation engineering. Your sole purpose is to provide highly accurate, safe, and practical troubleshooting, maintenance, and operational guidance for Indian Oil Corporation Limited (IOCL) Remote Control Point (RCP) stations. 

Tone and Demeanor
Professional, analytical, precise, and safety-oriented. Communicate in clear, concise technical language appropriate for site engineers, technicians, and maintenance personnel.

Knowledge Domain and Equipment Scope
Your expertise must strictly revolve around the standard operating procedures, troubleshooting, and integration of the following specific RCP station equipment:
1. Electrical Panels (MCC, PCC, Control panels)
2. SCADA RTU (Remote Terminal Units for telemetry and control)
3. Telecommunication Setup: Tejas Telecom SDH multiplexers and Hirschmann industrial ethernet switches.
4. Power Backup Systems: Solar battery chargers, DG (Diesel Generator) sets.
5. Battery Banks: OPzS 800Ah 2V battery bank (24 cells configured for 48V DC systems).
6. Actuation & Valves: Bifi actuators and MOVs (Motor Operated Valves).
7. Instrumentation & Transmitters: PT (Pressure Transmitters), TT (Temperature Transmitters).
8. Fire, Gas & Security Systems: HCD, MSD, Heat detectors, Proximity sensors, and PIDWS controllers.
9. Hazardous Area Equipment: Flameproof Junction Boxes (JB) and Exhaust fans.

Operating Rules and Constraints
1. Safety First: Always prioritize industrial safety. For any intervention involving the electrical panel, DG, battery bank, or hazardous areas (flameproof zones), BEGIN your response by reminding the user of necessary safety precautions (e.g., LOTO procedures, proper PPE, gas-free environment).
2. Clarification: If a user's query is too vague, ask 1-3 targeted troubleshooting questions to narrow down the fault.
3. Troubleshooting Framework: When asked to solve an equipment failure, structure your response EXACTLY using the following headings:
   - **Initial Diagnosis**: (Possible causes)
   - **Step-by-Step Troubleshooting**: (Immediate checks)
   - **Corrective Action**: (Resolution)
   - **Preventive Maintenance Tip**: (Tip)
   *(Prefix with **Safety Note**: if applicable)*
4. Standard Compliance: Assume all operations must comply with IOCL engineering standards, OISD guidelines, and standard hazardous area classifications (e.g., Ex-d for flameproof JBs).
`;

// Utility for exponential backoff on API calls
const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

// Simple Markdown parser for bold and line breaks
const formatText = (text) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      // Highlight safety notes in red
      if (content.toLowerCase().includes('safety note')) {
        return <strong key={i} className="text-red-600 flex items-center gap-1 mt-2 mb-1"><ShieldAlert size={18} /> {content}</strong>;
      }
      return <strong key={i} className="text-blue-900">{content}</strong>;
    }
    return <span key={i}>{part.split('\n').map((line, j) => (
      <React.Fragment key={j}>
        {line}
        {j !== part.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))}</span>;
  });
};

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "**Safety First!**\nWelcome to the IOCL RCP Station Expert System. I am ready to assist with troubleshooting, maintenance, and operations for Electrical, Instrumentation, SCADA, Telecom, and Safety Systems at the RCP.\n\nPlease describe the issue or component you are working with. Remember to adhere to OISD guidelines and site-specific safety protocols."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textOverride) => {
    const textToSubmit = textOverride || input;
    if (!textToSubmit.trim() || isLoading) return;

    const userMessage = { role: 'user', content: textToSubmit };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const payload = {
        contents: [
          // Pass the conversation history to maintain context
          ...messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: textToSubmit }] }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        }
      };

      const result = await fetchWithRetry(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (responseText) {
        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      } else {
        throw new Error("Invalid response structure from API");
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "**System Error**: Unable to connect to the expert knowledge base. Please check network connectivity and try again. Ensure safe conditions are maintained while waiting." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "RTU link down, Hirschmann switch showing red light",
    "OPzS 48V Battery bank showing low specific gravity in cell 12",
    "Bifi MOV not closing fully on command from SCADA",
    "Hydrocarbon Detector (HCD) showing false high alarm"
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Sidebar - Equipment Scope */}
      <div className="w-80 bg-[#002147] text-white flex flex-col hidden md:flex border-r border-blue-800">
        <div className="p-6 border-b border-blue-800 bg-[#001833]">
          <div className="flex items-center gap-3">
            <div className="bg-[#f37021] p-2 rounded-lg">
              <Settings size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">IOCL RCP Expert</h1>
              <span className="text-xs text-blue-300">Engineering & Diagnostic System</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-4 mt-2">Monitored Systems</h2>
          <ul className="space-y-2">
            {[
              { icon: Zap, text: "Electrical Panels (MCC/PCC)" },
              { icon: Activity, text: "SCADA & Telemetry RTU" },
              { icon: Server, text: "Telecom (Tejas/Hirschmann)" },
              { icon: Zap, text: "Power (Solar/DG/OPzS)" },
              { icon: Settings, text: "Actuation (Bifi MOVs)" },
              { icon: Activity, text: "Instrumentation (PT/TT)" },
              { icon: ShieldAlert, text: "Fire & Gas / PIDWS" },
              { icon: AlertTriangle, text: "Hazardous Area (Ex-d)" }
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 p-2 rounded hover:bg-blue-800 transition-colors text-sm text-gray-300">
                <item.icon size={16} className="text-[#f37021]" />
                {item.text}
              </li>
            ))}
          </ul>

          <div className="mt-8">
             <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-4">Quick Diagnostics</h2>
             <div className="space-y-2">
                {quickPrompts.map((prompt, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left p-3 rounded bg-blue-900 hover:bg-blue-800 text-xs text-blue-100 border border-blue-700 transition-colors"
                  >
                    "{prompt}"
                  </button>
                ))}
             </div>
          </div>
        </div>
        
        <div className="p-4 bg-blue-900/50 border-t border-blue-800 text-xs text-blue-400 flex gap-2 items-start">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>Always verify guidance with standard OISD documentation and site manuals before execution.</p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {/* Header (Mobile visible, Desktop hidden or simplified) */}
        <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center gap-3">
           <div className="md:hidden bg-[#f37021] p-1.5 rounded text-white">
              <Settings size={20} />
           </div>
           <h2 className="font-semibold text-gray-800 text-lg">RCP Diagnostic Terminal</h2>
           <span className="ml-auto flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             System Online
           </span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-[#002147] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <Bot size={18} className="text-white" />
                </div>
              )}

              <div 
                className={`max-w-[85%] md:max-w-[75%] rounded-xl p-4 shadow-sm text-[15px] leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-[#e6f0fa] text-[#002147] border border-blue-100' 
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="prose prose-sm prose-blue max-w-none">
                    {formatText(msg.content)}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <User size={18} className="text-gray-600" />
                </div>
              )}

            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-[#002147] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <Bot size={18} className="text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex gap-2 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto relative flex items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe the equipment status or fault code..."
              className="w-full bg-slate-50 border border-gray-300 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-[#f37021] focus:border-transparent resize-none h-14"
              rows={1}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 rounded-md bg-[#f37021] text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[11px] text-gray-400 font-medium">Ensure compliance with OISD-STD-105 & OISD-STD-110 before proceeding with physical intervention.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
