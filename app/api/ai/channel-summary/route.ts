import { NextResponse } from 'next/server';
import { getMessageProcessor } from '@/app/utils/ai/message-processor';
import { getSummaryGenerator } from '@/app/utils/ai/summary-generator';
import { ChannelSummaryRequest } from '@/app/types/openai';

export async function POST(request: Request) {
  try {
    const body = await request.json() as ChannelSummaryRequest;
    const { channelId, workspaceId, since, context } = body;

    if (!channelId || !workspaceId || !since) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get channel activity
    const messageProcessor = getMessageProcessor();
    const activity = await messageProcessor.getChannelActivity(channelId, since);

    // Generate summary
    const summaryGenerator = getSummaryGenerator();
    const summary = await summaryGenerator.generateChannelSummary(activity, context);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error generating channel summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate channel summary' },
      { status: 500 }
    );
  }
} 