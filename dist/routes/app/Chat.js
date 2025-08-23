"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = Chat;
const react_1 = require("react");
const cn_1 = require("../../lib/cn");
function Chat() {
    const [messages, setMessages] = (0, react_1.useState)([
        {
            id: '1',
            content: 'Hello! I\'m your financial AI assistant. How can I help you today?',
            role: 'assistant',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim())
            return;
        const userMessage = {
            id: Date.now().toString(),
            content: input,
            role: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setTimeout(() => {
            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                content: 'I understand your question. This is a placeholder response. The actual AI integration will be implemented soon.',
                role: 'assistant',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
        }, 1000);
    };
    return (<div className="flex flex-col h-full">
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (<div key={message.id} className={(0, cn_1.cn)('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={(0, cn_1.cn)('max-w-xs lg:max-w-md px-4 py-2 rounded-lg', message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground')}>
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>))}
        
        {isLoading && (<div className="flex justify-start">
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
          </div>)}
      </div>

      
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything about finance..." className="input flex-1" disabled={isLoading}/>
          <button type="submit" disabled={isLoading || !input.trim()} className={(0, cn_1.cn)('btn btn-primary px-6', (isLoading || !input.trim()) && 'opacity-50 cursor-not-allowed')}>
            Send
          </button>
        </form>
      </div>
    </div>);
}
//# sourceMappingURL=Chat.js.map