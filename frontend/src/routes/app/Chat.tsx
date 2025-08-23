import React, { useState, useRef, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { Loader2, Send, User, Bot } from 'lucide-react'
import { cn } from '../../lib/cn'
import { FAQTiles } from '../../components/faq/FAQTiles'
import { SimpleFaqSidebar } from '../../components/chat/SimpleFaqSidebar'
import { FAQ } from '../../services/faqService'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your financial AI assistant. How can I help you today?',
      role: 'assistant',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // TODO: Implement actual API call
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Thank you for your question. I\'m here to help with your financial queries. You can also check our FAQ section above for quick answers to common questions.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }
  
  const handleFAQSelect = (faq: FAQ) => {
    const faqMessage: Message = {
      id: Date.now().toString(),
      content: faq.question,
      role: 'user',
      timestamp: new Date()
    }
    
    const answerMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: faq.answer,
      role: 'assistant',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, faqMessage, answerMessage])
  }

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
          {/* FAQ Tiles Section - Only show when no messages */}
          {messages.length === 0 && (
            <div className="mb-8">
              <FAQTiles 
                onFAQSelect={handleFAQSelect}
                maxItems={6}
                className="mb-6"
              />
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm">
                  <Bot className="h-4 w-4" />
                  <span>Click on any FAQ above, use the sidebar, or start a conversation below</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about finance..."
                className="input flex-1"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                  'btn btn-primary px-6',
                  (isLoading || !input.trim()) && 'opacity-50 cursor-not-allowed'
                )}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* FAQ Sidebar */}
      <div className="w-80 border-l border-border bg-card">
        <SimpleFaqSidebar onFAQSelect={handleFAQSelect} />
      </div>
    </div>
  )
}