import { useEffect } from 'react'
import { useChatStore } from '../../stores/useChatStore'
import { FaqSidebar } from '../../components/chat/FaqSidebar'
import { ThreadControls } from '../../components/chat/ThreadControls'
import { ChatWindow } from '../../components/chat/ChatWindow'

export function ChatPage() {
  const { loadThreads, threads, activeThreadId, createNewThread } = useChatStore()

  useEffect(() => {
    loadThreads()
  }, [])

  useEffect(() => {
    // Create initial thread if none exist
    if (threads.length === 0 && !activeThreadId) {
      createNewThread('Welcome to Trae Finance')
    }
  }, [threads, activeThreadId, createNewThread])

  return (
    <div className="flex h-screen bg-background">
      {/* FAQ Sidebar */}
      <div className="w-80 border-r border-border bg-card">
        <FaqSidebar />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Thread Controls */}
        <div className="border-b border-border bg-card p-4">
          <ThreadControls />
        </div>
        
        {/* Chat Window */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow />
        </div>
      </div>
    </div>
  )
}