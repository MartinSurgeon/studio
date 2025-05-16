# Deploying to Vercel

## Prerequisites
- A Vercel account (sign up at https://vercel.com)
- The project files ready for upload

## Deployment Steps

1. **Access the Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Log in with your account

2. **Create a New Project**
   - Click "Add New..." > "Project"
   - Choose the option to upload your project

3. **Configure the Project**
   - Framework Preset: Select Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Add Environment Variables**
   Add the following environment variables:
   
   - `NEXT_PUBLIC_SUPABASE_URL`: https://wpkfgsgvkycyqmiptnmf.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwa2Znc2d2a3ljeXFtaXB0bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMzk1MjgsImV4cCI6MjA2MjcxNTUyOH0.cgfQGTfzSc5cgjGGS0nsBZBtLfnG609NeWK6FsgH3E1o
   - `NODE_OPTIONS`: --max_old_space_size=4096

5. **Deploy**
   - Click "Deploy"
   - Wait for the build and deployment to complete

6. **Access Your Application**
   - Once deployment is successful, you'll receive a URL to access your application

## Troubleshooting

### If you encounter the "next: command not found" error:

1. In the project settings, go to the "General" tab
2. Scroll down to "Node.js Version"
3. Set it to 18.x or higher (18.17.0 is recommended for Next.js 15)
4. Redeploy the project

### For other issues:

1. Check the Vercel logs in the deployment details
2. Verify your environment variables are correctly set
3. Ensure all project files are included in the upload 