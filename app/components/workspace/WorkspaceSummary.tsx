import { useState, useEffect } from 'react';
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { MessageInput } from "@/app/components/workspace/MessageInput";
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Bot, Loader2 } from 'lucide-react';
import { useSession } from "next-auth/react";

interface WorkspaceSummaryProps {
  workspaceId: string;
}

interface WorkspaceActivity {
  summary: string;
  channelActivities: {
    channelId: string;
    channelName: string;
    summary: string;
    keyTopics?: string[];
    decisions?: string[];
    actionItems?: string[];
  }[];
  dmActivities: {
    userId: string;
    summary: string;
    lastActive: string;
  }[];
  error?: string;
}

export function WorkspaceSummary({ workspaceId }: WorkspaceSummaryProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceActivity, setWorkspaceActivity] = useState<WorkspaceActivity | null>(null);

  useEffect(() => {
    const fetchWorkspaceActivity = async () => {
      if (!session?.user?.email) return;

      try {
        setIsLoading(true);
        
        // Get all channels in the workspace
        const channelsResponse = await fetch(`/api/channels?workspaceId=${workspaceId}`);
        if (!channelsResponse.ok) throw new Error('Failed to fetch channels');
        const channels = await channelsResponse.json();

        // Get workspace members for DM summary
        const membersResponse = await fetch(`/api/workspaces/${workspaceId}/members`);
        if (!membersResponse.ok) throw new Error('Failed to fetch members');
        const members = await membersResponse.json();

        // Get the last viewed timestamp from local storage or default to 24 hours ago
        const lastViewed = localStorage.getItem(`workspace_${workspaceId}_last_viewed`) || 
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Request summary for all channels and DMs
        const response = await fetch('/api/ai/workspace-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            channelIds: channels.map((c: any) => c.id),
            members: members.map((m: any) => m.email).filter((email: string) => email !== session.user?.email),
            since: lastViewed,
            userId: session.user.email
          })
        });

        if (!response.ok) throw new Error('Failed to fetch workspace summary');
        const data = await response.json();
        setWorkspaceActivity(data);
        
        // Update last viewed timestamp
        localStorage.setItem(`workspace_${workspaceId}_last_viewed`, new Date().toISOString());
      } catch (error) {
        console.error('Error fetching workspace activity:', error);
        setWorkspaceActivity({
          summary: "Failed to generate workspace summary",
          channelActivities: [],
          dmActivities: [],
          error: 'Failed to fetch workspace activity'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaceActivity();
  }, [workspaceId, session?.user?.email]);

  const handleSendMessage = async (content: string) => {
    // TODO: Implement AI interaction
    console.log('Sending message to AI:', content);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 min-h-[3rem] border-b flex items-center px-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">Ally the Admin</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : workspaceActivity ? (
              <>
                {/* Welcome Message */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                  <h2 className="font-semibold mb-2">Welcome back!</h2>
                  <p className="text-sm text-muted-foreground">
                    Here's what's been happening in your workspace since your last visit.
                  </p>
                </div>

                {/* Overall Summary */}
                <div className="bg-primary/5 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Overview</h3>
                  <p className="text-sm text-muted-foreground">{workspaceActivity.summary}</p>
                </div>

                {/* Channel Activities */}
                {workspaceActivity.channelActivities.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Channel Activity</h3>
                    {workspaceActivity.channelActivities.map((channel, index) => (
                      <div key={index} className="bg-accent/10 rounded-lg p-3 space-y-2">
                        <h4 className="font-medium text-sm">#{channel.channelName}</h4>
                        <p className="text-sm text-muted-foreground">{channel.summary}</p>
                        {channel.keyTopics && channel.keyTopics.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Key Topics:</p>
                            <ul className="text-xs text-muted-foreground list-disc list-inside">
                              {channel.keyTopics.map((topic, i) => (
                                <li key={i}>{topic}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {channel.decisions && channel.decisions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Decisions Made:</p>
                            <ul className="text-xs text-muted-foreground list-disc list-inside">
                              {channel.decisions.map((decision, i) => (
                                <li key={i}>{decision}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {channel.actionItems && channel.actionItems.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Action Items:</p>
                            <ul className="text-xs text-muted-foreground list-disc list-inside">
                              {channel.actionItems.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* DM Activities */}
                {workspaceActivity.dmActivities.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Direct Messages</h3>
                    {workspaceActivity.dmActivities.map((dm, index) => (
                      <div key={index} className="bg-accent/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {dm.userId[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <h4 className="font-medium text-sm">{dm.userId}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{dm.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {messages.map((message, index) => (
              <div key={index} className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>
                    {message.isBot ? 'AI' : 'You'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <MessageInput
            channelId={workspaceId}
            onMessageSent={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
} 