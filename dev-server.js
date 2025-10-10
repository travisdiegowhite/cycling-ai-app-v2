// Local development server for Vercel API functions
// Run this alongside `npm start` for local development

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk').default;
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Development API server running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Development API server running on http://localhost:${PORT}`);
  console.log(`📍 Claude Routes API: http://localhost:${PORT}/api/claude-routes`);
  console.log(`📍 Claude Enhance API: http://localhost:${PORT}/api/claude-enhance\n`);

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('⚠️  WARNING: ANTHROPIC_API_KEY not found in environment variables!');
    console.error('   Please add it to your .env file\n');
  } else {
    console.log('✅ Anthropic API key found\n');
  }
});
