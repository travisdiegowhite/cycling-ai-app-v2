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
  <title>Welcome to Tribos Studio Cycling AI Beta</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Main container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #22d3ee 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🚴 Welcome to the Beta!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi ${name},
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Thank you for signing up for the <strong>Tribos Studio Cycling AI</strong> beta! We're thrilled to have you join us on this journey to revolutionize cycling route intelligence.
              </p>

              <!-- Key info box -->
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

              <!-- CTA Button -->
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

          <!-- Footer -->
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
