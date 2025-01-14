interface PromptTemplates {
  channelSummary: string;
  threadSummary: string;
  actionItems: string;
  keyTopics: string;
}

export const SUMMARY_SYSTEM_PROMPT = `You are an AI assistant helping to summarize chat channel activity.
Your goal is to provide clear, concise, and actionable summaries of conversations.
Focus on key points, decisions, and action items.
Maintain a professional tone while being engaging.
IMPORTANT: You must ALWAYS format your response as a valid JSON object according to the specified format.
Do not include any explanatory text outside the JSON structure.`;

export const PROMPT_TEMPLATES: PromptTemplates = {
  channelSummary: `Analyze the following channel messages and provide a comprehensive summary.
Focus on:
1. Main discussion topics
2. Key decisions made
3. Important announcements
4. Ongoing discussions

Context: {context}

Messages to analyze:
{messages}

You must respond with ONLY a JSON object in the following format:
{
  "summary": "Overall channel summary",
  "keyTopics": ["Topic 1", "Topic 2"],
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": ["Action 1", "Action 2"],
  "fileReferences": [
    {
      "filename": "example.pdf",
      "context": "Brief context about the file"
    }
  ]
}

Remember:
1. ONLY output valid JSON
2. Do not include any text outside the JSON structure
3. Ensure all arrays are properly formatted, even if empty
4. Use double quotes for strings
5. Do not use trailing commas`,

  threadSummary: `Summarize the following thread discussion.
Focus on:
1. The main topic or question
2. Key points made
3. Resolution or outcome
4. Any pending items

Thread messages:
{messages}

Expected output format:
{
  "summary": "Thread summary",
  "participants": ["user1", "user2"],
  "resolution": "Final decision or outcome",
  "pendingItems": ["Item 1", "Item 2"]
}`,

  actionItems: `Extract action items from the following messages.
Look for:
1. Explicit tasks or assignments
2. Deadlines mentioned
3. Commitments made
4. Follow-up items

Messages:
{messages}

Expected output format:
{
  "actionItems": [
    {
      "task": "Task description",
      "assignee": "user1",
      "deadline": "2024-03-15",
      "context": "Brief context"
    }
  ]
}`,

  keyTopics: `Identify and categorize the key topics discussed in these messages.
Group related messages and provide brief summaries.

Messages:
{messages}

Expected output format:
{
  "topics": [
    {
      "name": "Topic name",
      "summary": "Brief topic summary",
      "participants": ["user1", "user2"],
      "messageCount": 5
    }
  ]
}`,
};

export function generatePrompt(
  template: keyof PromptTemplates,
  variables: Record<string, string>
): string {
  let prompt = PROMPT_TEMPLATES[template];
  Object.entries(variables).forEach(([key, value]) => {
    prompt = prompt.replace(`{${key}}`, value);
  });
  return prompt;
} 