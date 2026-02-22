import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import MobileHeader from './components/MobileHeader';

function App() {
  const [language, setLanguage] = useState('en');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex w-full h-screen bg-slate-50 overflow-hidden text-slate-800">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        language={language}
        setLanguage={setLanguage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col md:pl-72 h-full w-full relative">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <ChatInterface language={language} />
      </main>
    </div>
  );
}

export default App;

