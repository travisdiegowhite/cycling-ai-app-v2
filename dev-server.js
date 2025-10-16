// Local development server for Vercel API functions
// Run this alongside `npm start` for local development

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk').default;
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Claude Routes API endpoint
app.post('/api/claude-routes', async (req, res) => {
  try {
    // Validate API key exists (try both names)
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY or REACT_APP_ANTHROPIC_API_KEY in .env file');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error - API key not set'
      });
    }

    // Initialize Claude client
    const claude = new Anthropic({
      apiKey: apiKey,
    });

    // Validate request body
    const { prompt, maxTokens = 2000, temperature = 0.7 } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid prompt is required'
      });
    }

    // Validate prompt length
    if (prompt.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Prompt too long'
      });
    }

    console.log(`🧠 Claude API request - prompt length: ${prompt.length}`);

    // Call Claude API
    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: Math.min(maxTokens, 3000),
      temperature: Math.max(0, Math.min(temperature, 1)),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    console.log(`✅ Claude API response received`);

    return res.status(200).json({
      success: true,
      content: response.content[0].text,
      usage: response.usage
    });

  } catch (error) {
    console.error('❌ Claude API error:', error);

    let clientError = 'Route generation failed';
    let statusCode = 500;

    if (error.status === 429) {
      clientError = 'Rate limit exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.status === 401) {
      clientError = 'Authentication failed - check ANTHROPIC_API_KEY';
      statusCode = 500;
    } else if (error.status >= 400 && error.status < 500) {
      clientError = 'Invalid request';
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      error: clientError
    });
  }
});

// Claude Enhance API endpoint
app.post('/api/claude-enhance', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY or REACT_APP_ANTHROPIC_API_KEY in .env file');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const claude = new Anthropic({
      apiKey: apiKey,
    });

    const { prompt, maxTokens = 1500, temperature = 0.7 } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid prompt is required'
      });
    }

    console.log(`🧠 Claude Enhance API request - prompt length: ${prompt.length}`);

    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: Math.min(maxTokens, 2000),
      temperature: Math.max(0, Math.min(temperature, 1)),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    console.log(`✅ Claude Enhance API response received`);

    return res.status(200).json({
      success: true,
      content: response.content[0].text,
      usage: response.usage
    });

  } catch (error) {
    console.error('❌ Claude Enhance API error:', error);

    return res.status(500).json({
      success: false,
      error: 'Enhancement failed'
    });
  }
});

// Send Welcome Email API endpoint
app.post('/api/send-welcome-email', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in .env file');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const resend = new Resend(resendApiKey);

    console.log(`📧 Sending welcome email to: ${email}`);

    const { data, error } = await resend.emails.send({
      from: 'Tribos Studio <travis@tribos.studio>',
      to: [email],
      subject: 'Welcome to Tribos Studio Cycling AI Beta!',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Tribos Studio Cycling AI Beta</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #22d3ee 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🚴 Welcome to the Beta!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Thank you for signing up for the <strong>Tribos Studio Cycling AI</strong> beta! We're thrilled to have you join us on this journey to revolutionize cycling route intelligence.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdfa; border-left: 4px solid #10b981; margin: 30px 0; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 18px; font-weight: 600; color: #10b981;">
                      📅 Beta Launch: December 1, 2025
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">
                      Mark your calendar! You'll receive access instructions and your personalized login credentials closer to the launch date.
                    </p>
                  </td>
                </tr>
              </table>
              <h2 style="margin: 30px 0 15px; font-size: 20px; font-weight: 600; color: #111827;">
                What to Expect
              </h2>
              <ul style="margin: 0 0 20px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #374151;">
                <li style="margin-bottom: 10px;">
                  <strong>AI-Powered Route Generation:</strong> Create intelligent routes based on your preferences, fitness level, and terrain
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>Strava & Wahoo Integration:</strong> Seamlessly sync your activities and analyze your performance
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>Advanced Route Analysis:</strong> Get detailed insights on elevation, difficulty, and scenic points
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>Interactive Maps:</strong> Explore routes with rich visualizations and real-time weather data
                </li>
              </ul>
              <h2 style="margin: 30px 0 15px; font-size: 20px; font-weight: 600; color: #111827;">
                Try the Demo Now
              </h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                While you wait for beta access, you can explore all features using our demo account. No signup required!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://tribos.studio" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #22d3ee 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Try Demo Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                We'll keep you updated as we get closer to launch. If you have any questions or feedback, feel free to reply to this email.
              </p>
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Happy cycling! 🚴‍♂️<br>
                <strong>The Tribos Studio Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                Tribos Studio Cycling AI
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This email was sent because you signed up for our beta program.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    console.log(`✅ Welcome email sent successfully! Message ID: ${data.id}`);
    return res.status(200).json({ success: true, messageId: data.id });

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Development API server running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Development API server running on http://localhost:${PORT}`);
  console.log(`📍 Claude Routes API: http://localhost:${PORT}/api/claude-routes`);
  console.log(`📍 Claude Enhance API: http://localhost:${PORT}/api/claude-enhance`);
  console.log(`📍 Welcome Email API: http://localhost:${PORT}/api/send-welcome-email\n`);

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('⚠️  WARNING: ANTHROPIC_API_KEY not found in environment variables!');
    console.error('   Please add it to your .env file\n');
  } else {
    console.log('✅ Anthropic API key found');
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('⚠️  WARNING: RESEND_API_KEY not found in environment variables!');
    console.error('   Email sending will not work. Add it to your .env file\n');
  } else {
    console.log('✅ Resend API key found\n');
  }
});
