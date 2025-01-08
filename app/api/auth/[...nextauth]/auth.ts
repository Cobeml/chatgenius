import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from 'next-auth';
import { dynamoDb } from '@/utils/aws-config';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const result = await dynamoDb.get({
            TableName: process.env.AWS_DYNAMODB_USERS_TABLE!,
            Key: {
              email: credentials?.email
            }
          }).promise();

          const user = result.Item;

          if (user && credentials?.password) {
            const isValid = await bcrypt.compare(credentials.password, user.password);
            
            if (isValid) {
              return {
                id: user.email,
                email: user.email,
                name: user.email.split('@')[0]
              };
            }
          }
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/"
  }
}; 