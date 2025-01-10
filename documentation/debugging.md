# WebSocket Infrastructure Debugging

## Current Issue
WebSocket connections are being established but not persisted in DynamoDB. The connections table remains empty despite successful WebSocket connections.

### Symptoms
1. WebSocket connection is established successfully (client logs show connection)
2. DynamoDB connections table remains empty (confirmed via AWS CLI)
3. Browser console shows:
   - "Attempting WebSocket connection" logs
   - "WebSocket connection established" logs
   - No errors in console
4. Messages are not delivered in real-time (require page refresh)

## Infrastructure Setup

### API Gateway WebSocket Configuration
- Endpoint: `wss://prqb9y0mvd.execute-api.us-east-2.amazonaws.com/prod`
- Routes:
  - `$connect`: Handles new WebSocket connections
  - `$disconnect`: Handles connection closures
  - `message`: Handles message broadcasting
  - `presence`: Handles user presence updates
  - `typing`: Handles typing indicators

### DynamoDB Tables
1. `chatgenius-connections`:
   - Primary Key: `connectionId`
   - GSI: `workspaceIndex` on `workspaceId`
   - Required fields:
     - connectionId (string)
     - workspaceId (string)
     - userId (string)
     - timestamp (string)
     - status (string)
   - Currently shows 0 items despite connections

### Connection Flow
1. Client initiates connection with query parameters:
   ```typescript
   wsUrl.searchParams.append('token', session.user.email);
   wsUrl.searchParams.append('workspaceId', workspaceId);
   ```

2. Server `$connect` handler attempts to store connection:
   ```typescript
   const connectionItem = {
     connectionId,
     workspaceId,
     userId: token,
     timestamp: new Date().toISOString(),
     status: 'connected'
   };
   ```

## Required Files for Expert Review

1. **WebSocket Route Handler**
   - `app/api/websocket/route.ts`
   - Handles all WebSocket events including $connect
   - Contains DynamoDB connection storage logic

2. **WebSocket Hook**
   - `app/hooks/useWebSocket.ts`
   - Client-side WebSocket connection management
   - Connection parameter handling

3. **DynamoDB Schema**
   - `dynamodb-schema.ts`
   - Defines connection table structure
   - Contains GSI definitions

4. **AWS Infrastructure**
   - `iam-policies.json`
   - DynamoDB permissions
   - API Gateway configuration

5. **Environment Configuration**
   - `.env.local`
   - AWS credentials
   - Table names and endpoints

## Debugging Steps Taken

1. Verified table structure:
   - Confirmed table exists with correct schema
   - Verified GSI configuration
   - Confirmed 0 items in table

2. Added comprehensive logging:
   - Connection establishment
   - DynamoDB operations
   - Query parameter parsing

3. Verified infrastructure:
   - Confirmed API Gateway endpoint is accessible
   - Verified IAM permissions
   - Checked DynamoDB access

## Potential Issues

1. **Connection Storage**
   - DynamoDB put operation might be failing silently
   - IAM permissions might be insufficient
   - Table name might be incorrect in environment variables

2. **API Gateway Integration**
   - Integration might not be passing correct parameters
   - $connect route might not be properly configured
   - Lambda proxy integration might be misconfigured

## Next Steps

1. **Verify DynamoDB Access**
   - Test direct DynamoDB access
   - Verify IAM role permissions
   - Check environment variables

2. **API Gateway Investigation**
   - Review API Gateway logs
   - Test $connect integration
   - Verify parameter passing

3. **Connection Handler Testing**
   - Add error catching for DynamoDB operations
   - Test connection storage in isolation
   - Verify query parameter parsing

## Required Information for Expert Review

1. API Gateway CloudWatch logs
2. DynamoDB error logs
3. IAM role permissions
4. Environment variables configuration
5. API Gateway integration configuration

## Current Environment

- AWS Region: us-east-2
- API Gateway Stage: prod
- WebSocket URL: wss://prqb9y0mvd.execute-api.us-east-2.amazonaws.com/prod
- Management API: https://prqb9y0mvd.execute-api.us-east-2.amazonaws.com/prod 