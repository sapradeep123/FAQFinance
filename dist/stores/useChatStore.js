"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useChatStore = void 0;
const zustand_1 = require("zustand");
const dexie_1 = require("../lib/dexie");
const llmService_1 = require("../services/llmService");
exports.useChatStore = (0, zustand_1.create)()((set, get) => ({
    threads: [],
    activeThreadId: null,
    isLoading: false,
    error: null,
    loadThreads: async () => {
        try {
            const threads = await dexie_1.db.threads.orderBy('createdAt').reverse().toArray();
            set({ threads });
        }
        catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to load threads' });
        }
    },
    createNewThread: async (title = 'New Chat') => {
        try {
            const newThread = {
                id: Date.now().toString(),
                title,
                createdAt: Date.now(),
                messages: []
            };
            await dexie_1.db.threads.add(newThread);
            set(state => ({
                threads: [newThread, ...state.threads],
                activeThreadId: newThread.id
            }));
            return newThread.id;
        }
        catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to create thread' });
            throw error;
        }
    },
    switchThread: (threadId) => {
        set({ activeThreadId: threadId });
    },
    editThreadTitle: async (threadId, title) => {
        try {
            await dexie_1.db.threads.update(threadId, { title });
            set(state => ({
                threads: state.threads.map(thread => thread.id === threadId ? { ...thread, title } : thread)
            }));
        }
        catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update thread title' });
        }
    },
    saveMessage: async (threadId, message) => {
        try {
            const thread = await dexie_1.db.threads.get(threadId);
            if (!thread)
                throw new Error('Thread not found');
            const updatedMessages = [...thread.messages, message];
            await dexie_1.db.threads.update(threadId, { messages: updatedMessages });
            set(state => ({
                threads: state.threads.map(t => t.id === threadId ? { ...t, messages: updatedMessages } : t)
            }));
        }
        catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to save message' });
        }
    },
    sendMessage: async (threadId, content) => {
        const { saveMessage } = get();
        try {
            set({ isLoading: true, error: null });
            const userMessage = {
                id: Date.now().toString(),
                role: 'user',
                content,
                timestamp: Date.now()
            };
            await saveMessage(threadId, userMessage);
            const response = await llmService_1.llmService.ask({ threadId, question: content });
            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.consolidatedAnswer,
                timestamp: Date.now()
            };
            await saveMessage(threadId, assistantMessage);
            set({ isLoading: false });
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to send message',
                isLoading: false
            });
        }
    },
    deleteThread: async (threadId) => {
        try {
            await dexie_1.db.threads.delete(threadId);
            set(state => {
                const newThreads = state.threads.filter(t => t.id !== threadId);
                const newActiveId = state.activeThreadId === threadId
                    ? (newThreads.length > 0 ? newThreads[0].id : null)
                    : state.activeThreadId;
                return {
                    threads: newThreads,
                    activeThreadId: newActiveId
                };
            });
        }
        catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete thread' });
        }
    },
    clearError: () => {
        set({ error: null });
    }
}));
//# sourceMappingURL=useChatStore.js.map