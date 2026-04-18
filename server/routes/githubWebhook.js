import crypto from 'crypto';
import express from 'express';

const githubWebhook = express.Router();

const GITHUB_SECRET = process.env.GITHUB_SECRET;

// Middleware to verify signature
function verifyGitHubSignature(req, res, buf) {
  const signature = req.headers['x-hub-signature-256'];
  const hmac = crypto.createHmac('sha256', GITHUB_SECRET);
  hmac.update(buf);
  const digest = `sha256=${hmac.digest('hex')}`;
  if (signature !== digest) {
    throw new Error('GitHub signature mismatch!');
  }
}

// Webhook route
githubWebhook.post('/webhook', express.json({ verify: verifyGitHubSignature }), async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log('GitHub Event:', event);

  if (event === 'issues' && payload.action === 'opened') {
    const issueTitle = payload.issue.title;
    const issueCreator = payload.issue.user.login;

    console.log(`📬 New issue by ${issueCreator}: ${issueTitle}`);

    // TODO: Save to DB, send notification, or send an email
  }

  if (event === 'pull_request' && payload.action === 'opened') {
    const prTitle = payload.pull_request.title;
    const prUser = payload.pull_request.user.login;

    console.log(`🚀 New PR by ${prUser}: ${prTitle}`);

    // You can even trigger nodemailer to notify mentors
  }

  res.status(200).send('Webhook received');
});

export default githubWebhook;
