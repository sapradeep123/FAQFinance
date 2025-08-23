import { create } from 'zustand'
import { db, ChatThread, ChatMessage } from '../lib/dexie'
import { llmService } from '../services/llmService'

interface ChatStore {
  threads: ChatThread[]
  activeThreadId: string | null
  isLoading: boolean
  error: string | null
  
  // Actions
  loadThreads: () => Promise<void>
  createNewThread: (title?: string) => Promise<string>
  switchThread: (threadId: string) => void
  editThreadTitle: (threadId: string, title: string) => Promise<void>
  saveMessage: (threadId: string, message: ChatMessage) => Promise<void>
  sendMessage: (threadId: string, content: string) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
  clearError: () => void
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  threads: [],
  activeThreadId: null,
  isLoading: false,
  error: null,

  loadThreads: async () => {
    try {
      const threads = await db.threads.orderBy('createdAt').reverse().toArray()
      set({ threads })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load threads' })
    }
  },

  createNewThread: async (title = 'New Chat') => {
    try {
      const newThread: ChatThread = {
        id: Date.now().toString(),
        title,
        createdAt: Date.now(),
        messages: []
      }
      
      await db.threads.add(newThread)
      
      set(state => ({
        threads: [newThread, ...state.threads],
        activeThreadId: newThread.id
      }))
      
      return newThread.id
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create thread' })
      throw error
    }
  },

  switchThread: (threadId: string) => {
    set({ activeThreadId: threadId })
  },

  editThreadTitle: async (threadId: string, title: string) => {
    try {
      await db.threads.update(threadId, { title })
      
      set(state => ({
        threads: state.threads.map(thread => 
          thread.id === threadId ? { ...thread, title } : thread
        )
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update thread title' })
    }
  },

  saveMessage: async (threadId: string, message: ChatMessage) => {
    try {
      const thread = await db.threads.get(threadId)
      if (!thread) throw new Error('Thread not found')
      
      const updatedMessages = [...thread.messages, message]
      await db.threads.update(threadId, { messages: updatedMessages })
      
      set(state => ({
        threads: state.threads.map(t => 
          t.id === threadId ? { ...t, messages: updatedMessages } : t
        )
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save message' })
    }
  },

  sendMessage: async (threadId: string, content: string) => {
    const { saveMessage } = get()
    
    try {
      set({ isLoading: true, error: null })
      
      // Save user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now()
      }
      
      await saveMessage(threadId, userMessage)
      
      // Get LLM response
      const response = await llmService.ask({ threadId, question: content })
      
      // Save assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.consolidatedAnswer,
        timestamp: Date.now()
      }
      
      await saveMessage(threadId, assistantMessage)
      
      set({ isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false 
      })
    }
  },

  deleteThread: async (threadId: string) => {
    try {
      await db.threads.delete(threadId)
      
      set(state => {
        const newThreads = state.threads.filter(t => t.id !== threadId)
        const newActiveId = state.activeThreadId === threadId 
          ? (newThreads.length > 0 ? newThreads[0].id : null)
          : state.activeThreadId
        
        return {
          threads: newThreads,
          activeThreadId: newActiveId
        }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete thread' })
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))