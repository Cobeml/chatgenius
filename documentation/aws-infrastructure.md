# AWS Infrastructure

## Overview

ChatGenius uses various AWS services to provide a scalable and reliable infrastructure. This document details the AWS services used and their configurations.

## Current Status

### Implemented Services ✅
- DynamoDB Tables (Users, Workspaces, Channels, Messages)
- S3 File Storage
- IAM Policies and Roles
- CORS Configuration

### In Progress 🟡
- API Gateway WebSocket API
- Real-time Features Integration
- CloudFront CDN

## Services Used

### DynamoDB
Primary database service for storing application data.

#### Tables
1. **Users Table**
   - Table Name: `chatgenius-users`
   - Partition Key: `email` (string)
   - Provisioned Capacity: On-demand

2. **Workspaces Table**
   - Table Name: `chatgenius-workspaces`
   - Partition Key: `id` (string)
   - GSI: `members` for querying user's workspaces
   - Provisioned Capacity: On-demand

3. **Channels Table**
   - Table Name: `chatgenius-channels`
   - Partition Key: `workspaceId` (string)
   - Sort Key: `id` (string)
   - LSI: `position` for channel ordering
   - Provisioned Capacity: On-demand

4. **Messages Table**
   - Table Name: `chatgenius-messages`
   - Partition Key: `channelId` (string)
   - Sort Key: `timestamp` (string)
   - GSI: `userId` for user's message history
   - Provisioned Capacity: On-demand

### S3
Storage service for file attachments.

#### Bucket Configuration
- Bucket Name: `chatgenius-files-{environment}`
- Region: Same as application region
- Access: Private with presigned URLs
- CORS: Enabled for application domain
- Lifecycle Rules: 
  - Transition to IA after 30 days
  - Delete incomplete multipart uploads after 7 days

#### CORS Configuration
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://chatgenius-eight.vercel.app/"
        ],
        "ExposeHeaders": ["ETag"]
    }
]
```

### IAM
Identity and Access Management for security.

#### Application User Policy
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${AWS_S3_BUCKET_NAME}",
                "arn:aws:s3:::${AWS_S3_BUCKET_NAME}/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": [
                "arn:aws:dynamodb:*:*:table/chatgenius-*"
            ]
        }
    ]
}
```

## Security Configuration

### S3 Bucket Policy
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPresignedURLAccess",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${AWS_S3_BUCKET_NAME}/*",
            "Condition": {
                "StringLike": {
                    "aws:Referer": [
                        "http://localhost:3000/*",
                        "https://chatgenius-eight.vercel.app/*"
                    ]
                }
            }
        }
    ]
}
```

## Monitoring and Logging

### CloudWatch
- DynamoDB operation metrics
- S3 bucket access logs
- Custom application metrics

### X-Ray
- API latency tracking
- Service map visualization
- Error tracing

## Cost Optimization

### DynamoDB
- On-demand capacity mode
- Auto-scaling policies
- TTL for temporary data

### S3
- Lifecycle policies
- Intelligent-Tiering
- Multipart upload cleanup

## Backup Strategy

### DynamoDB
- Point-in-time recovery enabled
- Daily backups
- 35-day retention period

### S3
- Versioning enabled
- Cross-region replication (planned)
- Lifecycle rules for old versions

## Environment Separation

### Development
- Separate AWS account
- Limited capacity
- Debug logging enabled

### Production
- Dedicated AWS account
- Production-grade capacity
- Enhanced monitoring

## Deployment Configuration

### Infrastructure as Code
- AWS CloudFormation templates
- Resource naming conventions
- Environment variables

### CI/CD Integration
- AWS credentials in GitHub Secrets
- Automated deployments
- Resource validation

## Scaling Considerations

### DynamoDB
- Partition key design
- GSI/LSI optimization
- Capacity planning

### S3
- CloudFront integration
- Multipart uploads
- Access patterns

## Future Enhancements

1. **Real-time Features** 🟡
   - API Gateway WebSocket API (in progress)
   - Lambda integration (planned)
   - Connection management (planned)

2. **Performance Optimization** 📋
   - CloudFront CDN integration
   - Lambda@Edge for routing
   - Enhanced caching strategy

3. **Media Processing** 📋
   - Lambda image resizing
   - MediaConvert integration
   - Thumbnail generation

4. **Monitoring Enhancements** 📋
   - Enhanced CloudWatch metrics
   - Custom dashboards
   - Automated alerting 