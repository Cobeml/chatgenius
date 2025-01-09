# Development Guide

## Prerequisites

- Node.js 18.x or later
- AWS Account with appropriate permissions
- Git

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatgenius.git
cd chatgenius
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# AWS Configuration
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_BUCKET_REGION=your-bucket-region

# DynamoDB Tables
AWS_DYNAMODB_USERS_TABLE=chatgenius-users
AWS_DYNAMODB_WORKSPACES_TABLE=chatgenius-workspaces
AWS_DYNAMODB_CHANNELS_TABLE=chatgenius-channels
AWS_DYNAMODB_MESSAGES_TABLE=chatgenius-messages
```

## AWS Setup

1. Create DynamoDB tables:
   - Users table with email as partition key
   - Workspaces table with id as partition key
   - Channels table with composite key (workspaceId, id)
   - Messages table with composite key (channelId, timestamp)

2. Create S3 bucket:
   - Enable CORS using `s3-cors.json`
   - Configure bucket policy for public read access
   - Set up lifecycle rules for file management

3. Configure IAM:
   - Create IAM user for application
   - Attach policies from `iam-policies.json`
   - Generate access keys for local development

## Development Workflow

1. Start the development server:
```bash
npm run dev
```

2. Access the application:
   - Open http://localhost:3000
   - Sign up for a new account
   - Create a workspace

## Code Structure

```
├── app/
│   ├── api/              # API routes
│   ├── components/       # Reusable components
│   │   ├── auth/        # Authentication components
│   │   ├── ui/          # UI primitives
│   │   └── workspace/   # Workspace components
│   └── workspace/       # Workspace pages
├── documentation/       # Project documentation
├── lib/                # Utility functions
├── public/            # Static assets
├── scripts/           # Maintenance scripts
└── utils/             # AWS configurations
```

## Component Development

1. UI Components:
   - Located in `app/components/ui`
   - Built on Radix UI primitives
   - Styled with Tailwind CSS

2. Feature Components:
   - Located in respective feature directories
   - Follow atomic design principles
   - Include component-specific types

3. Page Components:
   - Use Next.js App Router
   - Implement server components where possible
   - Handle client-side state management

## Testing

1. Component Testing:
```bash
# Run component tests
npm run test:components
```

2. API Testing:
```bash
# Run API tests
npm run test:api
```

3. E2E Testing:
```bash
# Run end-to-end tests
npm run test:e2e
```

## Deployment

1. Vercel Deployment:
   - Connect GitHub repository
   - Configure environment variables
   - Deploy main branch

2. AWS Configuration:
   - Set up production AWS resources
   - Configure CORS and security settings
   - Set up monitoring and logging

## Common Tasks

### Adding a New API Route

1. Create route file in `app/api`
2. Implement request handlers
3. Add authentication if required
4. Update API documentation

### Creating a New Component

1. Create component file
2. Add TypeScript interfaces
3. Implement component logic
4. Add Tailwind styles
5. Create test file

### Database Operations

1. Use DynamoDB client from `utils/aws-config.ts`
2. Follow schema definitions
3. Implement error handling
4. Add logging where necessary

## Best Practices

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier
- Write meaningful commit messages
- Document complex logic

### Security

- Validate all inputs
- Sanitize user data
- Use proper authentication
- Follow AWS security best practices

### Performance

- Optimize database queries
- Implement caching where appropriate
- Use proper indexing
- Monitor API response times

## Troubleshooting

### Common Issues

1. AWS Credentials:
   - Check `.env.local` configuration
   - Verify IAM permissions
   - Test AWS CLI access

2. Database Errors:
   - Verify table schemas
   - Check GSI/LSI configurations
   - Monitor DynamoDB capacity

3. API Issues:
   - Check request/response formats
   - Verify authentication
   - Monitor API logs

### Debug Tools

1. DynamoDB:
   - AWS Console
   - NoSQL Workbench
   - CloudWatch Logs

2. Application:
   - Browser DevTools
   - Next.js Debug Mode
   - API Route Handlers 

## UI Guidelines

### Dark Mode Considerations

- Use `text-foreground` for icons and text to ensure visibility in both light and dark modes
- Use `hover:bg-accent` instead of specific colors like `hover:bg-gray-100` for hover states
- For destructive actions (delete, exit, etc.), use `text-destructive`
- Avoid hardcoding light-specific colors that might be invisible on dark backgrounds
- Test all UI elements in both light and dark modes before deployment

### Feature Accessibility

- Important features should be accessible from multiple logical locations
  - Example: Channel settings accessible from both header and sidebar
- Use consistent icons and naming across different access points
- Consider user workflow when placing feature access points
- Maintain visual hierarchy to avoid interface clutter

### Icon Usage

- Always provide hover states for interactive icons
- Consider adding tooltips for icon-only buttons
- Use consistent icon sizes within each context
- Ensure sufficient contrast in both light and dark modes
- Use opacity transitions for hover states (opacity-0 group-hover:opacity-100)

### UI Consistency Patterns

#### Member Lists
- Use consistent styling for all member management interfaces
- Include member avatars with first letter capitalized
- Apply hover states with `hover:bg-primary-hover/10`
- Add border with `border-primary-hover/20`
- Include smooth transitions with `transition-all`
- Implement scrollable containers for long lists
- Use consistent spacing and padding

#### Form Controls
- Use consistent input and button styles
- Apply proper focus states with ring styling
- Maintain consistent heights for adjacent elements
- Use appropriate disabled states
- Follow spacing patterns across forms

### Component Guidelines

[Rest of the existing content...] 