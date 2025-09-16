// Vercel API Route: Secure Claude AI Route Generation
// This moves Claude AI calls server-side to protect API keys

import Anthropic from '@anthropic-ai/sdk';

// CORS helper
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return ['https://www.tribos.studio', 'https://cycling-ai-app-v2.vercel.app'];
  }
  return ['http://localhost:3000'];
};

const corsHeaders = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
  // Get client origin
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  // Set CORS headers
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
  res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
  res.setHeader('Access-Control-Allow-Credentials', corsHeaders['Access-Control-Allow-Credentials']);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({}).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate API key exists
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('Missing Anthropic API key');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Initialize Claude client (server-side only)
    const claude = new Anthropic({
      apiKey: apiKey,
    });

    // Validate request body
    const { prompt, maxTokens = 2000, temperature = 0.7 } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Valid prompt is required' });
    }

    // Validate prompt length (prevent abuse)
    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt too long' });
    }

    // Rate limiting check (basic implementation)
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // TODO: Implement proper rate limiting with Redis/database

    console.log(`Claude API request from IP: ${clientIP}, prompt length: ${prompt.length}`);

    // Call Claude API
    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: Math.min(maxTokens, 3000), // Cap max tokens
      temperature: Math.max(0, Math.min(temperature, 1)), // Clamp temperature
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return res.status(200).json({
      success: true,
      content: response.content[0].text,
      usage: response.usage
    });

  } catch (error) {
    console.error('Claude API error:', error);

    // Don't expose internal errors to client
    let clientError = 'Route generation failed';
    let statusCode = 500;

    if (error.status === 429) {
      clientError = 'Rate limit exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.status === 401) {
      clientError = 'Authentication failed';
      statusCode = 500; // Don't expose auth details
    } else if (error.status >= 400 && error.status < 500) {
      clientError = 'Invalid request';
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      error: clientError
    });
  }
}