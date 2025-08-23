# Cycling AI App 🚴‍♂️

An intelligent cycling route generation and analysis application powered by Claude AI, designed to create personalized training routes based on your preferences, past rides, and current conditions.

## ✨ Features

### 🤖 AI-Powered Route Generation
- **Claude AI Integration**: Leverages Anthropic's Claude AI for intelligent route recommendations
- **Personalized Routes**: Learns from your riding history to suggest optimal routes
- **Training Goal Optimization**: Routes tailored for recovery, endurance, intervals, or hill training
- **Weather Integration**: Real-time weather data influences route suggestions

### 📊 Comprehensive Route Analysis
- **Elevation Profiles**: Interactive charts showing elevation changes throughout your route
- **Route Statistics**: Distance, elevation gain/loss, estimated time, average gradient, and max elevation
- **Gradient Visualization**: Color-coded difficulty indicators with reference lines
- **Training Metrics**: Time estimates based on training goals and elevation factors

### 🎯 Smart Route Types
- **Loop Routes**: Return to your starting point
- **Out & Back**: Go out and return the same way  
- **Point-to-Point**: End at a different location
- **Learning System**: Analyzes past rides to identify preferred areas and patterns

### 🗺️ Interactive Mapping
- **Mapbox Integration**: High-quality outdoor maps optimized for cycling
- **Real-time Visualization**: See your route overlaid on detailed terrain maps
- **Multiple Route Options**: Generate and compare several route alternatives
- **Start Location Selection**: Use current location or click anywhere on the map

### 📈 Ride Analysis & History
- **FIT File Support**: Import rides from Garmin devices and other fitness trackers
- **Pattern Recognition**: Identifies frequently ridden areas and preferred route characteristics
- **Personal Templates**: Creates route templates based on your riding history
- **Performance Tracking**: Analyze elevation, speed, and distance trends

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Mapbox API token
- Anthropic Claude API key
- Supabase account (for data storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cycling-ai-app.git
   cd cycling-ai-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
   REACT_APP_ANTHROPIC_API_KEY=your_claude_api_key_here
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_OPENWEATHER_API_KEY=your_openweather_api_key
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### API Keys Setup

#### Mapbox Token
1. Sign up at [Mapbox](https://mapbox.com)
2. Create a new access token with appropriate scopes
3. Add to your `.env` file

#### Claude AI API Key
1. Sign up at [Anthropic](https://anthropic.com)
2. Generate an API key from your dashboard
3. Add to your `.env` file

#### Supabase Setup
1. Create a new project at [Supabase](https://supabase.com)
2. Set up tables for `routes` and `track_points`
3. Add your URL and anon key to `.env`

### Database Schema

The app expects these Supabase tables:

**routes**
```sql
CREATE TABLE routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text,
  distance_km numeric,
  elevation_gain_m numeric,
  coordinates jsonb,
  created_at timestamp DEFAULT now()
);
```

**track_points** 
```sql
CREATE TABLE track_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id uuid REFERENCES routes(id),
  latitude numeric,
  longitude numeric,
  elevation numeric,
  timestamp timestamp,
  created_at timestamp DEFAULT now()
);
```

## 🏗️ Architecture

### Core Components
- **AIRouteGenerator**: Main interface for route generation parameters
- **AIRouteMap**: Interactive map component with route visualization
- **RouteProfile**: Elevation charts and detailed route statistics
- **FileUpload**: FIT file import and processing

### AI Services
- **claudeRouteService.js**: Claude AI integration for intelligent route generation
- **aiRouteGenerator.js**: Main route generation logic with fallback systems
- **rideAnalysis.js**: Pattern recognition and learning from past rides

### Utilities
- **weather.js**: Real-time weather data integration
- **geo.js**: Geographic calculations and route processing
- **units.js**: Unit conversion (metric/imperial) and preferences

## 🎨 Tech Stack

- **Frontend**: React 18, Mantine UI, Recharts
- **Mapping**: Mapbox GL JS, react-map-gl
- **AI**: Anthropic Claude API
- **Backend**: Supabase (Database, Auth)
- **Build Tools**: Create React App, PostCSS
- **Icons**: Lucide React

## 📝 Usage

1. **Set Start Location**: Use current location or click on the map
2. **Configure Parameters**: 
   - Set available time (15 minutes to 4 hours)
   - Choose training goal (recovery, endurance, intervals, hills)
   - Select route type (loop, out & back, point-to-point)
3. **Generate Routes**: Click "Generate AI Routes" for personalized options
4. **Analyze Routes**: View elevation profiles and detailed statistics
5. **Import History**: Upload FIT files to improve AI recommendations

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run deploy`
Deploys to Vercel (configured)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Anthropic Claude AI** for intelligent route generation
- **Mapbox** for beautiful cycling maps
- **Supabase** for backend infrastructure
- **Mantine** for UI components
- **Recharts** for data visualization

---

**Happy Cycling!** 🚴‍♂️🌟
