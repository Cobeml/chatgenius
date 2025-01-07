import { ScrollArea } from "@/app/components/ui/scroll-area";
import { MessageInput } from "@/app/components/workspace/MessageInput";

export default function WorkspacePage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center px-4">
        <h1 className="font-semibold">General</h1>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Messages will go here */}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        <MessageInput channelId="general" />
      </div>
    </div>
  );
} 