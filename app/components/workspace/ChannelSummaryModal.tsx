import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Loader2 } from 'lucide-react';
import { InboxIcon } from 'lucide-react';

interface ChannelSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  workspaceId: string;
  channelName: string;
}

export function ChannelSummaryModal({
  isOpen,
  onClose,
  channelId,
  workspaceId,
  channelName
}: ChannelSummaryModalProps) {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen, channelId]);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the last viewed timestamp from local storage
      const lastViewed = localStorage.getItem(`channel_${channelId}_last_viewed`);
      const context = lastViewed 
        ? "Summarizing messages you haven't seen since your last visit" 
        : "Summarizing the most recent channel activity (last 25 messages)";
      
      const response = await fetch('/api/ai/channel-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          workspaceId,
          since: lastViewed || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last viewed time or last 24 hours
          context
        })
      });

      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummary(data);
      
      // Update last viewed timestamp
      localStorage.setItem(`channel_${channelId}_last_viewed`, new Date().toISOString());
    } catch (error) {
      console.error('Error fetching summary:', error);
      setError('Failed to load channel summary');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>#{channelName} Summary</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center text-destructive py-8">
                {error}
              </div>
            ) : summary ? (
              <div className="space-y-6">
                {/* Main Summary */}
                <div className="space-y-2">
                  <h3 className="font-medium">Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    {summary.summary === "No messages found in the specified time period." ? (
                      <span className="flex items-center gap-2">
                        <InboxIcon className="h-4 w-4" />
                        No messages found in this time period. Check back later for updates!
                      </span>
                    ) : (
                      summary.summary
                    )}
                  </p>
                </div>

                {/* Only show these sections if we have messages */}
                {summary.summary !== "No messages found in the specified time period." && (
                  <>
                    {/* Key Topics */}
                    {summary.keyTopics?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Key Topics</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.keyTopics.map((topic: string, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground">{topic}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Decisions */}
                    {summary.decisions?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Decisions Made</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.decisions.map((decision: string, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground">{decision}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Items */}
                    {summary.actionItems?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Action Items</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.actionItems.map((item: string, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* File References */}
                    {summary.fileReferences?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Shared Files</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.fileReferences.map((file: { filename: string, context: string }, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              <span className="font-medium">{file.filename}</span> - {file.context}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Thread Summaries */}
                    {summary.threadSummaries?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Thread Discussions</h3>
                        <div className="space-y-3">
                          {summary.threadSummaries.map((thread: any, index: number) => (
                            <div key={index} className="bg-primary/5 rounded-lg p-3 space-y-1">
                              <p className="text-sm">{thread.summary}</p>
                              {thread.resolution && (
                                <p className="text-sm text-primary">Resolution: {thread.resolution}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 