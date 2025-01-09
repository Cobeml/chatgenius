const { DynamoDB } = require('aws-sdk');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const WORKSPACES_TABLE = process.env.AWS_DYNAMODB_WORKSPACES_TABLE;

if (!WORKSPACES_TABLE) {
  console.error('AWS_DYNAMODB_WORKSPACES_TABLE environment variable is not set in .env.local');
  process.exit(1);
}

async function cleanupDuplicateMembers() {
  try {
    // Scan all workspaces
    const result = await dynamodb.scan({
      TableName: WORKSPACES_TABLE
    }).promise();

    const workspaces = result.Items || [];
    console.log(`Found ${workspaces.length} workspaces to check`);

    for (const workspace of workspaces) {
      if (!workspace.members) continue;

      // Get unique members by userId
      const uniqueMembers = Array.from(
        new Map(
          workspace.members.map((member: { userId: string, role: 'owner' | 'admin' | 'member' }) => [member.userId, member])
        ).values()
      );

      // Only update if we found duplicates
      if (uniqueMembers.length < workspace.members.length) {
        console.log(`Fixing workspace ${workspace.id}: ${workspace.members.length} -> ${uniqueMembers.length} members`);
        
        await dynamodb.update({
          TableName: WORKSPACES_TABLE,
          Key: { id: workspace.id },
          UpdateExpression: 'SET members = :uniqueMembers',
          ExpressionAttributeValues: {
            ':uniqueMembers': uniqueMembers
          }
        }).promise();
      }
    }

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupDuplicateMembers(); 