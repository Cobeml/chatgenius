import { DynamoDB, S3, ApiGatewayManagementApi } from 'aws-sdk';

export const dynamoDb = new DynamoDB.DocumentClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

export const s3 = new S3({
    region: process.env.AWS_S3_BUCKET_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

export const wsApi = new ApiGatewayManagementApi({
    endpoint: process.env.AWS_API_GATEWAY_ENDPOINT,
    region: process.env.AWS_REGION
}); 