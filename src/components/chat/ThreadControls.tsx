import { useState, useMemo } from 'react'
import { Plus, Search, ChevronDown, MessageSquare, Calendar, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useChatStore } from '../../stores/useChatStore'
import { useToast } from '../../hooks/use-toast'
import { cn } from '../../lib/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export function ThreadControls() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const {
    threads,
    activeThreadId,
    createNewThread,
    switchThread,
    deleteThread,
    isLoading
  } = useChatStore()
  const { toast } = useToast()

  const activeThread = threads.find(t => t.id === activeThreadId)

  // Search functionality - search in titles and message content
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads
    
    const query = searchQuery.toLowerCase()
    return threads.filter(thread => {
      // Search in title
      if (thread.title.toLowerCase().includes(query)) return true
      
      // Search in message content (snippets)
      return thread.messages.some(message => 
        message.content.toLowerCase().includes(query)
      )
    })
  }, [threads, searchQuery])

  const handleNewThread = async () => {
    try {
      await createNewThread()
      toast({
        title: 'New thread created',
        description: 'Start a new conversation!'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create new thread.',
        variant: 'destructive'
      })
    }
  }

  const handleSwitchThread = (threadId: string) => {
    switchThread(threadId)
    setSearchQuery('') // Clear search when switching
  }

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent dropdown from closing
    
    try {
      await deleteThread(threadId)
      toast({
        title: 'Thread deleted',
        description: 'The conversation has been removed.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete thread.',
        variant: 'destructive'
      })
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getMessageSnippet = (thread: any) => {
    const lastMessage = thread.messages[thread.messages.length - 1]
    if (!lastMessage) return 'No messages yet'
    
    const content = lastMessage.content
    return content.length > 60 ? content.substring(0, 60) + '...' : content
  }

  return (
    <div className="flex items-center gap-3">
      {/* New Thread Button */}
      <Button
        onClick={handleNewThread}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        New Thread
      </Button>

      {/* Thread Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 min-w-[200px] justify-between">
            <div className="flex items-center gap-2 truncate">
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {activeThread?.title || 'Select Thread'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
          {/* Search Input */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="pl-8 pr-8"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Thread List */}
          {filteredThreads.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? 'No threads found' : 'No threads yet'}
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <DropdownMenuItem
                key={thread.id}
                className={cn(
                  "p-3 cursor-pointer flex flex-col items-start gap-1",
                  thread.id === activeThreadId && "bg-accent"
                )}
                onClick={() => handleSwitchThread(thread.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium truncate flex-1">
                    {thread.title}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(thread.createdAt)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate w-full">
                  {getMessageSnippet(thread)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Global Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Search Results Dropdown */}
        {searchQuery && isSearchFocused && filteredThreads.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {filteredThreads.slice(0, 5).map((thread) => (
              <div
                key={thread.id}
                className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                onClick={() => {
                  handleSwitchThread(thread.id)
                  setIsSearchFocused(false)
                }}
              >
                <div className="font-medium text-sm truncate">{thread.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {getMessageSnippet(thread)}
                </div>
              </div>
            ))}
            {filteredThreads.length > 5 && (
              <div className="p-2 text-center text-xs text-muted-foreground border-t border-border">
                +{filteredThreads.length - 5} more results
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thread Info */}
      {activeThread && (
        <div className="text-sm text-muted-foreground">
          {activeThread.messages.length} message{activeThread.messages.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}