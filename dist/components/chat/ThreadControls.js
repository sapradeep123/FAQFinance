"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadControls = ThreadControls;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const button_1 = require("../ui/button");
const input_1 = require("../ui/input");
const useChatStore_1 = require("../../stores/useChatStore");
const use_toast_1 = require("../../hooks/use-toast");
const cn_1 = require("../../lib/cn");
const dropdown_menu_1 = require("../ui/dropdown-menu");
function ThreadControls() {
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [isSearchFocused, setIsSearchFocused] = (0, react_1.useState)(false);
    const { threads, activeThreadId, createNewThread, switchThread, deleteThread, isLoading } = (0, useChatStore_1.useChatStore)();
    const { toast } = (0, use_toast_1.useToast)();
    const activeThread = threads.find(t => t.id === activeThreadId);
    const filteredThreads = (0, react_1.useMemo)(() => {
        if (!searchQuery.trim())
            return threads;
        const query = searchQuery.toLowerCase();
        return threads.filter(thread => {
            if (thread.title.toLowerCase().includes(query))
                return true;
            return thread.messages.some(message => message.content.toLowerCase().includes(query));
        });
    }, [threads, searchQuery]);
    const handleNewThread = async () => {
        try {
            await createNewThread();
            toast({
                title: 'New thread created',
                description: 'Start a new conversation!'
            });
        }
        catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create new thread.',
                variant: 'destructive'
            });
        }
    };
    const handleSwitchThread = (threadId) => {
        switchThread(threadId);
        setSearchQuery('');
    };
    const handleDeleteThread = async (threadId, e) => {
        e.stopPropagation();
        try {
            await deleteThread(threadId);
            toast({
                title: 'Thread deleted',
                description: 'The conversation has been removed.'
            });
        }
        catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete thread.',
                variant: 'destructive'
            });
        }
    };
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        else if (diffInHours < 24 * 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };
    const getMessageSnippet = (thread) => {
        const lastMessage = thread.messages[thread.messages.length - 1];
        if (!lastMessage)
            return 'No messages yet';
        const content = lastMessage.content;
        return content.length > 60 ? content.substring(0, 60) + '...' : content;
    };
    return (<div className="flex items-center gap-3">
      
      <button_1.Button onClick={handleNewThread} disabled={isLoading} className="flex items-center gap-2">
        <lucide_react_1.Plus className="h-4 w-4"/>
        New Thread
      </button_1.Button>

      
      <dropdown_menu_1.DropdownMenu>
        <dropdown_menu_1.DropdownMenuTrigger asChild>
          <button_1.Button variant="outline" className="flex items-center gap-2 min-w-[200px] justify-between">
            <div className="flex items-center gap-2 truncate">
              <lucide_react_1.MessageSquare className="h-4 w-4 flex-shrink-0"/>
              <span className="truncate">
                {activeThread?.title || 'Select Thread'}
              </span>
            </div>
            <lucide_react_1.ChevronDown className="h-4 w-4 flex-shrink-0"/>
          </button_1.Button>
        </dropdown_menu_1.DropdownMenuTrigger>
        <dropdown_menu_1.DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
          
          <div className="p-2">
            <div className="relative">
              <lucide_react_1.Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
              <input_1.Input placeholder="Search threads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} className="pl-8 pr-8"/>
              {searchQuery && (<button_1.Button variant="ghost" size="sm" className="absolute right-1 top-1 h-6 w-6 p-0" onClick={() => setSearchQuery('')}>
                  <lucide_react_1.X className="h-3 w-3"/>
                </button_1.Button>)}
            </div>
          </div>
          
          <dropdown_menu_1.DropdownMenuSeparator />
          
          
          {filteredThreads.length === 0 ? (<div className="p-4 text-center text-muted-foreground">
              {searchQuery ? 'No threads found' : 'No threads yet'}
            </div>) : (filteredThreads.map((thread) => (<dropdown_menu_1.DropdownMenuItem key={thread.id} className={(0, cn_1.cn)("p-3 cursor-pointer flex flex-col items-start gap-1", thread.id === activeThreadId && "bg-accent")} onClick={() => handleSwitchThread(thread.id)}>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium truncate flex-1">
                    {thread.title}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <lucide_react_1.Calendar className="h-3 w-3"/>
                      {formatDate(thread.createdAt)}
                    </div>
                    <button_1.Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground" onClick={(e) => handleDeleteThread(thread.id, e)}>
                      <lucide_react_1.X className="h-3 w-3"/>
                    </button_1.Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate w-full">
                  {getMessageSnippet(thread)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
                </div>
              </dropdown_menu_1.DropdownMenuItem>)))}
        </dropdown_menu_1.DropdownMenuContent>
      </dropdown_menu_1.DropdownMenu>

      
      <div className="flex-1 max-w-md">
        <div className="relative">
          <lucide_react_1.Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
          <input_1.Input placeholder="Search all conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9"/>
        </div>
        
        
        {searchQuery && isSearchFocused && filteredThreads.length > 0 && (<div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {filteredThreads.slice(0, 5).map((thread) => (<div key={thread.id} className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0" onClick={() => {
                    handleSwitchThread(thread.id);
                    setIsSearchFocused(false);
                }}>
                <div className="font-medium text-sm truncate">{thread.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {getMessageSnippet(thread)}
                </div>
              </div>))}
            {filteredThreads.length > 5 && (<div className="p-2 text-center text-xs text-muted-foreground border-t border-border">
                +{filteredThreads.length - 5} more results
              </div>)}
          </div>)}
      </div>

      
      {activeThread && (<div className="text-sm text-muted-foreground">
          {activeThread.messages.length} message{activeThread.messages.length !== 1 ? 's' : ''}
        </div>)}
    </div>);
}
//# sourceMappingURL=ThreadControls.js.map