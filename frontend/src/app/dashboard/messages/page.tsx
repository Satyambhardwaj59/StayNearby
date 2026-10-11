'use client';
import { apiFetch } from '@/lib/api/client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, Send, ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConversationItem {
  _id: string;
  propertyId: {
    _id: string;
    title: string;
    slug: string;
    rent: number;
  };
  lastMessage: string;
  lastMessageAt: string;
}

interface MessageItem {
  _id: string;
  senderId: {
    _id: string;
    name: string;
  };
  content: string;
  createdAt: string;
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Load conversations or create one for propertyId
  useEffect(() => {
    async function init() {
      try {
        if (propertyId) {
          const res = await apiFetch('/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId }),
          });
          if (res.ok) {
            const data = await res.json();
            setActiveConvId(data.data._id);
          }
        }

        const convsRes = await apiFetch('/conversations');
        if (convsRes.ok) {
          const data = await convsRes.json();
          if (Array.isArray(data.data)) {
            setConversations(data.data);
            if (!propertyId && data.data.length > 0) {
              setActiveConvId(data.data[0]._id);
            }
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [propertyId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) return;

    async function fetchMessages() {
      try {
        const res = await apiFetch(`/messages?conversationId=${activeConvId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) {
            setMessages(data.data);
          }
        }
      } catch {
        // Fallback
      }
    }
    fetchMessages();
  }, [activeConvId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvId) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const res = await apiFetch('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvId,
          content,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.data]);
      }
    } catch {
      // Ignore
    }
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Messages & Inquiries
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Chat directly with prospective tenants and property owners
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 rounded-2xl border bg-card overflow-hidden h-[600px] shadow-sm">
        {/* Left: Conversation list */}
        <div className="border-r border-border overflow-y-auto">
          <div className="p-4 border-b font-semibold text-xs uppercase tracking-wider text-muted-foreground">
            All Conversations
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading conversations...</div>
          ) : conversations.length > 0 ? (
            <div className="divide-y">
              {conversations.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => setActiveConvId(c._id)}
                  className={`w-full text-left p-4 hover:bg-muted/50 transition flex items-start gap-3 ${
                    activeConvId === c._id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {c.propertyId?.title || 'Property Conversation'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.lastMessage || 'Start conversation...'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No conversations yet. When you inquire on a listing, messages appear here.
            </div>
          )}
        </div>

        {/* Right: Messages Thread */}
        <div className="md:col-span-2 flex flex-col h-full bg-background">
          {activeConvId ? (
            <>
              {/* Messages View */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length > 0 ? (
                  messages.map((m) => (
                    <div
                      key={m._id}
                      className="max-w-[75%] rounded-2xl px-4 py-2 text-sm bg-primary text-primary-foreground ml-auto rounded-tr-xs shadow-xs"
                    >
                      <p>{m.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-xs text-muted-foreground">
                    Say hello! Send your first message regarding the property.
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 rounded-xl border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <Button type="submit" size="sm" className="rounded-xl px-4">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm p-6 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p>Select a conversation from the left to view messages.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-12 text-center text-sm text-muted-foreground">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
          Loading conversations...
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
