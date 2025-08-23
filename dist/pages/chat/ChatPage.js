"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPage = ChatPage;
const react_1 = require("react");
const useChatStore_1 = require("../../stores/useChatStore");
const FaqSidebar_1 = require("../../components/chat/FaqSidebar");
const ThreadControls_1 = require("../../components/chat/ThreadControls");
const ChatWindow_1 = require("../../components/chat/ChatWindow");
function ChatPage() {
    const { loadThreads, threads, activeThreadId, createNewThread } = (0, useChatStore_1.useChatStore)();
    (0, react_1.useEffect)(() => {
        loadThreads();
    }, []);
    (0, react_1.useEffect)(() => {
        if (threads.length === 0 && !activeThreadId) {
            createNewThread('Welcome to Trae Finance');
        }
    }, [threads, activeThreadId, createNewThread]);
    return (<div className="flex h-screen bg-background">
      
      <div className="w-80 border-r border-border bg-card">
        <FaqSidebar_1.FaqSidebar />
      </div>
      
      
      <div className="flex-1 flex flex-col">
        
        <div className="border-b border-border bg-card p-4">
          <ThreadControls_1.ThreadControls />
        </div>
        
        
        <div className="flex-1 overflow-hidden">
          <ChatWindow_1.ChatWindow />
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=ChatPage.js.map