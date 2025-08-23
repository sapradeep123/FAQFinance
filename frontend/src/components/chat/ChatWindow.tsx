import { useState, useRef, useEffect } from 'react'
import { Send, Edit2, RotateCcw, AlertTriangle, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { useChatStore } from '../../stores/useChatStore'
import { useToast } from '../../hooks/use-toast'
import { cn } from '../../lib/utils'
import { Alert, AlertDescription } from '../ui/alert'

interface ChatWindowProps {
  className?: string
}

export function ChatWindow({ className }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [showFinanceWarning, setShowFinanceWarning] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  
  const {
    threads,
    activeThreadId,
    sendMessage,
    saveMessage,
    isLoading
  } = useChatStore()
  const { toast } = useToast()

  const activeThread = threads.find(t => t.id === activeThreadId)
  const messages = activeThread?.messages || []

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  useEffect(() => {
    if (editTextareaRef.current) {
      editTextareaRef.current.style.height = 'auto'
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`
    }
  }, [editingContent])

  // Finance detection - simple keyword matching
  const isFinanceRelated = (text: string): boolean => {
    const financeKeywords = [
      'bank', 'banking', 'loan', 'credit', 'debt', 'mortgage', 'investment', 'invest',
      'stock', 'bond', 'portfolio', 'finance', 'financial', 'money', 'cash', 'savings',
      'account', 'payment', 'transaction', 'budget', 'tax', 'taxes', 'insurance',
      'retirement', 'pension', 'dividend', 'interest', 'rate', 'currency', 'forex',
      'crypto', 'bitcoin', 'trading', 'market', 'economy', 'economic', 'price',
      'cost', 'expense', 'income', 'salary', 'wage', 'profit', 'loss', 'revenue'
    ]
    
    const lowerText = text.toLowerCase()
    return financeKeywords.some(keyword => lowerText.includes(keyword))
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !activeThreadId) return

    // Check if message is finance-related
    if (!isFinanceRelated(message)) {
      setShowFinanceWarning(true)
      // Still allow sending, just show warning
    }

    try {
      if (activeThreadId) {
        await sendMessage(activeThreadId, message.trim())
        setMessage('')
        setShowFinanceWarning(false)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive'
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!editingContent.trim() || !activeThreadId) return

    try {
      // Find the message index
      const messageIndex = messages.findIndex(m => m.id === messageId)
      if (messageIndex === -1) return

      // Update the message content
      const updatedMessage = {
        ...messages[messageIndex],
        content: editingContent.trim()
      }

      await saveMessage(activeThreadId, updatedMessage)
      
      // If this was a user message, regenerate the next assistant response
      if (updatedMessage.role === 'user' && messageIndex < messages.length - 1) {
        const nextMessage = messages[messageIndex + 1]
        if (nextMessage.role === 'assistant') {
          // Regenerate response based on the edited prompt
          if (activeThreadId) {
            await sendMessage(activeThreadId, editingContent.trim())
          }
        }
      }

      setEditingMessageId(null)
      setEditingContent('')
      
      toast({
        title: 'Message updated',
        description: updatedMessage.role === 'user' ? 'Response will be regenerated.' : 'Message has been updated.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update message.',
        variant: 'destructive'
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent('')
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!activeThread) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No thread selected</div>
          <div className="text-sm">Create a new thread or select an existing one to start chatting.</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Finance Warning Banner */}
      {showFinanceWarning && (
        <Alert className="m-4 mb-0 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800 dark:text-amber-200">
              This question doesn't appear to be finance-related. Trae Finance is optimized for financial queries.
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
              onClick={() => setShowFinanceWarning(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="text-lg font-medium mb-2">Start a conversation</div>
            <div className="text-sm">Ask me anything about finance, banking, investments, or taxes.</div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2 relative group",
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {editingMessageId === msg.id ? (
                  <div className="space-y-2">
                    <Textarea
                      ref={editTextareaRef}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="min-h-[60px] resize-none"
                      placeholder="Edit your message..."
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(msg.id)}
                        disabled={!editingContent.trim()}
                      >
                        Save & Regenerate
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                      <span>{formatTimestamp(msg.timestamp)}</span>
                      {msg.role === 'user' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditMessage(msg.id, msg.content)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                </div>
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about finance, banking, investments, taxes..."
              className="min-h-[60px] max-h-[200px] resize-none pr-12"
              disabled={isLoading}
            />
            <Button
              size="sm"
              className="absolute bottom-2 right-2 h-8 w-8 p-0"
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}