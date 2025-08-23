"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatWindow = ChatWindow;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const button_1 = require("../ui/button");
const textarea_1 = require("../ui/textarea");
const useChatStore_1 = require("../../stores/useChatStore");
const use_toast_1 = require("../../hooks/use-toast");
const cn_1 = require("../../lib/cn");
const alert_1 = require("../ui/alert");
function ChatWindow({ className }) {
    const [message, setMessage] = (0, react_1.useState)('');
    const [editingMessageId, setEditingMessageId] = (0, react_1.useState)(null);
    const [editingContent, setEditingContent] = (0, react_1.useState)('');
    const [showFinanceWarning, setShowFinanceWarning] = (0, react_1.useState)(false);
    const messagesEndRef = (0, react_1.useRef)(null);
    const textareaRef = (0, react_1.useRef)(null);
    const editTextareaRef = (0, react_1.useRef)(null);
    const { threads, activeThreadId, sendMessage, saveMessage, isLoading } = (0, useChatStore_1.useChatStore)();
    const { toast } = (0, use_toast_1.useToast)();
    const activeThread = threads.find(t => t.id === activeThreadId);
    const messages = activeThread?.messages || [];
    (0, react_1.useEffect)(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    (0, react_1.useEffect)(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [message]);
    (0, react_1.useEffect)(() => {
        if (editTextareaRef.current) {
            editTextareaRef.current.style.height = 'auto';
            editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
        }
    }, [editingContent]);
    const isFinanceRelated = (text) => {
        const financeKeywords = [
            'bank', 'banking', 'loan', 'credit', 'debt', 'mortgage', 'investment', 'invest',
            'stock', 'bond', 'portfolio', 'finance', 'financial', 'money', 'cash', 'savings',
            'account', 'payment', 'transaction', 'budget', 'tax', 'taxes', 'insurance',
            'retirement', 'pension', 'dividend', 'interest', 'rate', 'currency', 'forex',
            'crypto', 'bitcoin', 'trading', 'market', 'economy', 'economic', 'price',
            'cost', 'expense', 'income', 'salary', 'wage', 'profit', 'loss', 'revenue'
        ];
        const lowerText = text.toLowerCase();
        return financeKeywords.some(keyword => lowerText.includes(keyword));
    };
    const handleSendMessage = async () => {
        if (!message.trim() || !activeThreadId)
            return;
        if (!isFinanceRelated(message)) {
            setShowFinanceWarning(true);
        }
        try {
            await sendMessage(message.trim());
            setMessage('');
            setShowFinanceWarning(false);
        }
        catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to send message.',
                variant: 'destructive'
            });
        }
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };
    const handleEditMessage = (messageId, content) => {
        setEditingMessageId(messageId);
        setEditingContent(content);
    };
    const handleSaveEdit = async (messageId) => {
        if (!editingContent.trim() || !activeThreadId)
            return;
        try {
            const messageIndex = messages.findIndex(m => m.id === messageId);
            if (messageIndex === -1)
                return;
            const updatedMessage = {
                ...messages[messageIndex],
                content: editingContent.trim()
            };
            await saveMessage(activeThreadId, updatedMessage);
            if (updatedMessage.role === 'user' && messageIndex < messages.length - 1) {
                const nextMessage = messages[messageIndex + 1];
                if (nextMessage.role === 'assistant') {
                    await sendMessage(editingContent.trim(), true);
                }
            }
            setEditingMessageId(null);
            setEditingContent('');
            toast({
                title: 'Message updated',
                description: updatedMessage.role === 'user' ? 'Response will be regenerated.' : 'Message has been updated.'
            });
        }
        catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update message.',
                variant: 'destructive'
            });
        }
    };
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingContent('');
    };
    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    if (!activeThread) {
        return (<div className={(0, cn_1.cn)("flex items-center justify-center h-full", className)}>
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No thread selected</div>
          <div className="text-sm">Create a new thread or select an existing one to start chatting.</div>
        </div>
      </div>);
    }
    return (<div className={(0, cn_1.cn)("flex flex-col h-full", className)}>
      
      {showFinanceWarning && (<alert_1.Alert className="m-4 mb-0 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <lucide_react_1.AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400"/>
          <alert_1.AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800 dark:text-amber-200">
              This question doesn't appear to be finance-related. Trae Finance is optimized for financial queries.
            </span>
            <button_1.Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200" onClick={() => setShowFinanceWarning(false)}>
              <lucide_react_1.X className="h-3 w-3"/>
            </button_1.Button>
          </alert_1.AlertDescription>
        </alert_1.Alert>)}

      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (<div className="text-center text-muted-foreground py-8">
            <div className="text-lg font-medium mb-2">Start a conversation</div>
            <div className="text-sm">Ask me anything about finance, banking, investments, or taxes.</div>
          </div>) : (messages.map((msg) => (<div key={msg.id} className={(0, cn_1.cn)("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={(0, cn_1.cn)("max-w-[80%] rounded-lg px-4 py-2 relative group", msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted')}>
                {editingMessageId === msg.id ? (<div className="space-y-2">
                    <textarea_1.Textarea ref={editTextareaRef} value={editingContent} onChange={(e) => setEditingContent(e.target.value)} className="min-h-[60px] resize-none" placeholder="Edit your message..."/>
                    <div className="flex gap-2 justify-end">
                      <button_1.Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </button_1.Button>
                      <button_1.Button size="sm" onClick={() => handleSaveEdit(msg.id)} disabled={!editingContent.trim()}>
                        Save & Regenerate
                      </button_1.Button>
                    </div>
                  </div>) : (<>
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                      <span>{formatTimestamp(msg.timestamp)}</span>
                      {msg.role === 'user' && (<button_1.Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEditMessage(msg.id, msg.content)}>
                          <lucide_react_1.Edit2 className="h-3 w-3"/>
                        </button_1.Button>)}
                    </div>
                  </>)}
              </div>
            </div>)))}
        
        
        {isLoading && (<div className="flex justify-start">
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
          </div>)}
        
        <div ref={messagesEndRef}/>
      </div>

      
      <div className="border-t p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea_1.Textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask about finance, banking, investments, taxes..." className="min-h-[60px] max-h-[200px] resize-none pr-12" disabled={isLoading}/>
            <button_1.Button size="sm" className="absolute bottom-2 right-2 h-8 w-8 p-0" onClick={handleSendMessage} disabled={!message.trim() || isLoading}>
              <lucide_react_1.Send className="h-4 w-4"/>
            </button_1.Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=ChatWindow.js.map