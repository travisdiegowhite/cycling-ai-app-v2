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
      subject: "You're officially part of the Tribos.Studio Beta!",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're officially part of the Tribos.Studio Beta!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #22d3ee 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3;">
                You're officially part of the Tribos.Studio Beta!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi ${name},
              </p>

              <!-- Tribos meaning section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; margin: 0 0 25px 0; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 15px; line-height: 1.7; color: #78350f;">
                      <strong style="color: #92400e;">τρίβος (tribos)</strong> - An ancient Greek word meaning "the road less traveled, a path worn by those who venture beyond the ordinary."
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #78350f;">
                      That's exactly what we help you discover: unique routes tailored to your goals, not just the same paths everyone else rides.
                    </p>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 30px 0 15px; font-size: 20px; font-weight: 600; color: #111827;">
                Our Mission
              </h2>
              <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.6; color: #374151;">
                Make every ride better through intelligent, AI-powered route planning that adapts to your goals and fitness.
              </p>

              <h2 style="margin: 30px 0 15px; font-size: 20px; font-weight: 600; color: #111827;">
                Get Started
              </h2>
              <ul style="margin: 0 0 25px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #374151;">
                <li style="margin-bottom: 10px;">
                  <strong>Generate your first AI-powered route</strong> - just set your goal and time
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>Explore our professional route builder</strong> with elevation profiles and key metrics
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>Optionally import your ride history</strong> for personalized recommendations
                </li>
              </ul>

              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 10px;">
                          <a href="https://tribos.studio" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #22d3ee 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; white-space: nowrap;">
                            Start Exploring →
                          </a>
                        </td>
                        <td style="padding-left: 10px;">
                          <a href="https://tribos.studio" style="display: inline-block; padding: 14px 28px; background-color: #ffffff; color: #10b981; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; border: 2px solid #10b981; white-space: nowrap;">
                            Invite Friends →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 30px 0 15px; font-size: 20px; font-weight: 600; color: #111827;">
                Coming Soon
              </h2>
              <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.6; color: #374151;">
                Direct integrations with <strong>Garmin</strong> and <strong>Wahoo</strong>, plus enhanced Strava connectivity. For now, you can import your Strava history if you'd like the AI to learn from your past rides.
              </p>

              <h2 style="margin: 30px 0 15px; font-size: 20px; font-weight: 600; color: #111827;">
                We Need Your Help
              </h2>
              <ul style="margin: 0 0 25px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #374151;">
                <li style="margin-bottom: 10px;">
                  Test features and share honest feedback
                </li>
                <li style="margin-bottom: 10px;">
                  Invite fellow cyclists who'd benefit from smarter route planning
                </li>
                <li style="margin-bottom: 10px;">
                  Help us build the future of cycling tech
                </li>
              </ul>

              <!-- Beta notice box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; margin: 30px 0; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #1e40af;">
                      <strong>This is Beta</strong>, so expect some rough edges. But also expect rapid improvements based on your input. You're not just testing software - you're shaping it.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px; font-size: 18px; line-height: 1.6; color: #111827; font-weight: 600;">
                Ready to ride smarter?
              </p>

              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Travis White<br>
                <strong>Tribos.Studio</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                Tribos.Studio - Discover the road less traveled
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
