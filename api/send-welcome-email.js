const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * API endpoint to send welcome email to beta signups
 * POST /api/send-welcome-email
 * Body: { name: string, email: string }
 */
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Send welcome email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Tribos Studio <onboarding@tribos.studio>',
      to: [email],
      subject: 'Welcome to Tribos Studio Cycling AI Beta!',
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
                  <strong>Explore our professional route builder</strong> with elevation profiles
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
      console.error('Resend API error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    console.log('Welcome email sent successfully:', data);
    res.status(200).json({ success: true, messageId: data.id });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
