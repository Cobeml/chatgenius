import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { DynamoDB } from 'aws-sdk';
import { OpenAIClient } from '@/app/utils/openai/client';
import { isDMChannel, getDMChannelId } from '@/app/utils/dm';

const dynamoDb = new DynamoDB.DocumentClient();
const openai = new OpenAIClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, channelIds, members, since, userId } = await request.json();

    if (!workspaceId || !channelIds || !members || !since || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch channel messages
    const channelActivities = await Promise.all(channelIds.map(async (channelId: string) => {
      try {
        // Query messages since the given timestamp
        const messagesResponse = await dynamoDb.query({
          TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
          KeyConditionExpression: 'channelId = :channelId AND #ts > :since',
          ExpressionAttributeNames: {
            '#ts': 'timestamp'
          },
          ExpressionAttributeValues: {
            ':channelId': channelId,
            ':since': since
          }
        }).promise();

        const messages = messagesResponse.Items || [];
        
        if (messages.length === 0) return null;

        // Get channel name
        const channelResponse = await dynamoDb.get({
          TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
          Key: {
            workspaceId,
            id: channelId
          }
        }).promise();

        const channelName = channelResponse.Item?.name || channelId;

        // Generate summary using OpenAI
        const prompt = `Summarize the following channel activity in a concise way. Extract key topics, decisions made, and action items if any exist. Do not use markdown formatting or special characters.
Format the response as follows:
Key Topics:
- topic 1
- topic 2

Decisions:
- decision 1
- decision 2

Action Items:
- action 1
- action 2

Messages:
${messages.map(m => `${m.userId}: ${m.content}`).join('\n')}`;

        const completion = await openai.generateCompletion([
          { role: 'system', content: 'You are a helpful assistant that summarizes channel activity. Provide summaries in plain text without markdown or special characters.' },
          { role: 'user', content: prompt }
        ]);
        const summary = completion.choices[0].message.content?.trim() || 'No summary available';

        // Extract structured information from the plain text format
        const lines = summary.split('\n');
        const keyTopics: string[] = [];
        const decisions: string[] = [];
        const actionItems: string[] = [];

        let currentSection = '';
        for (const line of lines) {
          const cleanLine = line.replace(/[*_`]/g, '').trim(); // Remove any markdown characters
          if (cleanLine.toLowerCase().startsWith('key topics:')) currentSection = 'topics';
          else if (cleanLine.toLowerCase().startsWith('decisions:')) currentSection = 'decisions';
          else if (cleanLine.toLowerCase().startsWith('action items:')) currentSection = 'actions';
          else if (cleanLine.startsWith('-')) {
            const item = cleanLine.substring(1).trim();
            if (currentSection === 'topics') keyTopics.push(item);
            else if (currentSection === 'decisions') decisions.push(item);
            else if (currentSection === 'actions') actionItems.push(item);
          }
        }

        return {
          channelId,
          channelName,
          summary,
          keyTopics,
          decisions,
          actionItems
        };
      } catch (error) {
        console.error(`Error processing channel ${channelId}:`, error);
        return null;
      }
    }));

    // Fetch DM messages
    const dmActivities = await Promise.all(members.map(async (memberEmail: string) => {
      try {
        const dmChannelId = getDMChannelId(userId, memberEmail);
        
        // Query messages since the given timestamp
        const messagesResponse = await dynamoDb.query({
          TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
          KeyConditionExpression: 'channelId = :channelId AND #ts > :since',
          ExpressionAttributeNames: {
            '#ts': 'timestamp'
          },
          ExpressionAttributeValues: {
            ':channelId': dmChannelId,
            ':since': since
          }
        }).promise();

        const messages = messagesResponse.Items || [];
        
        if (messages.length === 0) return null;

        // Generate summary using OpenAI
        const prompt = `Summarize the following direct message conversation in a brief, natural way. Do not use markdown formatting or special characters:
${messages.map(m => `${m.userId}: ${m.content}`).join('\n')}`;

        const completion = await openai.generateCompletion([
          { role: 'system', content: 'You are a helpful assistant that summarizes conversations in plain text without markdown or special characters.' },
          { role: 'user', content: prompt }
        ]);
        const summary = completion.choices[0].message.content?.trim()
          .replace(/[*_`]/g, '') // Remove any markdown characters
          || 'No recent activity';

        return {
          userId: memberEmail,
          summary,
          lastActive: messages[messages.length - 1].timestamp
        };
      } catch (error) {
        console.error(`Error processing DMs with ${memberEmail}:`, error);
        return null;
      }
    }));

    // Generate overall workspace summary
    const allMessages = channelActivities
      .filter(Boolean)
      .map(channel => `Channel #${channel?.channelName}:\n${channel?.summary}`)
      .concat(
        dmActivities
          .filter(Boolean)
          .map(dm => `DM with ${dm?.userId}:\n${dm?.summary}`)
      )
      .join('\n\n');

    const overallPrompt = `Generate a brief, high-level summary of all the recent workspace activity. Do not use markdown formatting or special characters:
${allMessages}`;

    const overallCompletion = await openai.generateCompletion([
      { role: 'system', content: 'You are a helpful assistant that summarizes workspace activity in plain text without markdown or special characters.' },
      { role: 'user', content: overallPrompt }
    ]);
    const overallSummary = overallCompletion.choices[0].message.content?.trim()
      .replace(/[*_`]/g, '') // Remove any markdown characters
      || 'No recent activity in the workspace';

    return NextResponse.json({
      summary: overallSummary,
      channelActivities: channelActivities.filter(Boolean),
      dmActivities: dmActivities.filter(Boolean)
    });
  } catch (error) {
    console.error('Error generating workspace summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate workspace summary' },
      { status: 500 }
    );
  }
} 