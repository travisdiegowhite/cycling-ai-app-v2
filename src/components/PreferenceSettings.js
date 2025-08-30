import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Stack,
  Group,
  Text,
  Title,
  Select,
  Slider,
  Switch,
  MultiSelect,
  Paper,
  Tabs,
  Badge,
  Alert,
  LoadingOverlay,
} from '@mantine/core';
import {
  Settings,
  Route,
  Shield,
  Mountain,
  Camera,
  Heart,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { EnhancedContextCollector } from '../utils/enhancedContext';
import toast from 'react-hot-toast';

const PreferenceSettings = ({ opened, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('routing');
  
  // Routing preferences
  const [trafficTolerance, setTrafficTolerance] = useState('low');
  const [hillPreference, setHillPreference] = useState('moderate');
  const [maxGradient, setMaxGradient] = useState(10);
  const [turningPreference, setTurningPreference] = useState('minimal_turns');
  
  // Surface preferences
  const [surfaceQuality, setSurfaceQuality] = useState('good');
  const [gravelTolerance, setGravelTolerance] = useState(10);
  const [wetWeatherPavedOnly, setWetWeatherPavedOnly] = useState(true);
  
  // Safety preferences
  const [bikeInfrastructure, setBikeInfrastructure] = useState('strongly_preferred');
  const [restStopFrequency, setRestStopFrequency] = useState(15);
  const [cellCoverage, setCellCoverage] = useState('important');
  
  // Scenic preferences
  const [scenicImportance, setScenicImportance] = useState('important');
  const [preferredViews, setPreferredViews] = useState(['nature', 'water']);
  const [photographyStops, setPhotographyStops] = useState(true);
  const [quietnessLevel, setQuietnessLevel] = useState('high');
  
  // Training context
  const [trainingPhase, setTrainingPhase] = useState('base_building');
  const [weeklyVolume, setWeeklyVolume] = useState(100);
  const [fatigueLevel, setFatigueLevel] = useState('fresh');

  // Load existing preferences
  useEffect(() => {
    if (!user || !opened) return;
    
    const loadPreferences = async () => {
      setLoading(true);
      try {
        const prefs = await EnhancedContextCollector.getCompletePreferences(user.id);
        if (prefs) {
          // Routing preferences
          setTrafficTolerance(prefs.traffic_tolerance || 'low');
          setHillPreference(prefs.hill_preference || 'moderate');
          setMaxGradient(prefs.max_gradient_comfort || 10);
          setTurningPreference(prefs.turning_preference || 'minimal_turns');
          
          // Surface preferences
          setSurfaceQuality(prefs.surface_quality || 'good');
          setGravelTolerance((prefs.gravel_tolerance || 0.1) * 100);
          setWetWeatherPavedOnly(prefs.wet_weather_paved_only !== false);
          
          // Safety preferences
          setBikeInfrastructure(prefs.bike_infrastructure || 'strongly_preferred');
          setRestStopFrequency(prefs.rest_stop_frequency || 15);
          setCellCoverage(prefs.cell_coverage || 'important');
          
          // Scenic preferences
          setScenicImportance(prefs.scenic_importance || 'important');
          setPreferredViews(prefs.preferred_views || ['nature', 'water']);
          setPhotographyStops(prefs.photography_stops !== false);
          setQuietnessLevel(prefs.quietness_level || 'high');
          
          // Training context
          setTrainingPhase(prefs.current_phase || 'base_building');
          setWeeklyVolume(prefs.weekly_volume_km || 100);
          setFatigueLevel(prefs.fatigue_level || 'fresh');
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        toast.error('Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, [user, opened]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save routing preferences
      await EnhancedContextCollector.updatePreferences(user.id, 'routing', {
        traffic_tolerance: trafficTolerance,
        hill_preference: hillPreference,
        max_gradient_comfort: maxGradient,
        turning_preference: turningPreference,
      });
      
      // Save surface preferences
      await EnhancedContextCollector.updatePreferences(user.id, 'surface', {
        surface_quality: surfaceQuality,
        gravel_tolerance: gravelTolerance / 100,
        wet_weather_paved_only: wetWeatherPavedOnly,
      });
      
      // Save safety preferences
      await EnhancedContextCollector.updatePreferences(user.id, 'safety', {
        bike_infrastructure: bikeInfrastructure,
        rest_stop_frequency: restStopFrequency,
        cell_coverage: cellCoverage,
      });
      
      // Save scenic preferences
      await EnhancedContextCollector.updatePreferences(user.id, 'scenic', {
        scenic_importance: scenicImportance,
        preferred_views: preferredViews,
        photography_stops: photographyStops,
        quietness_level: quietnessLevel,
      });
      
      // Save training context
      await EnhancedContextCollector.updatePreferences(user.id, 'training', {
        current_phase: trainingPhase,
        weekly_volume_km: weeklyVolume,
        fatigue_level: fatigueLevel,
      });
      
      toast.success('Preferences saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <Settings size={24} />
          <Title order={3}>Route Preferences</Title>
        </Group>
      }
      size="lg"
      overlayProps={{ opacity: 0.55, blur: 3 }}
    >
      <LoadingOverlay visible={loading} />
      
      <Stack>
        <Alert icon={<AlertCircle size={16} />} color="blue">
          Customize your route preferences to get more personalized AI-generated routes that match your riding style and goals.
        </Alert>
        
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="routing" leftSection={<Route size={16} />}>
              Routing
            </Tabs.Tab>
            <Tabs.Tab value="surface" leftSection={<Mountain size={16} />}>
              Surface
            </Tabs.Tab>
            <Tabs.Tab value="safety" leftSection={<Shield size={16} />}>
              Safety
            </Tabs.Tab>
            <Tabs.Tab value="scenic" leftSection={<Camera size={16} />}>
              Scenic
            </Tabs.Tab>
            <Tabs.Tab value="training" leftSection={<Heart size={16} />}>
              Training
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="routing" pt="md">
            <Stack>
              <Select
                label="Traffic Tolerance"
                description="How comfortable are you riding near traffic?"
                value={trafficTolerance}
                onChange={setTrafficTolerance}
                data={[
                  { value: 'low', label: 'Low - Prefer quiet roads' },
                  { value: 'medium', label: 'Medium - Some traffic okay' },
                  { value: 'high', label: 'High - Comfortable with traffic' },
                ]}
              />
              
              <Select
                label="Hill Preference"
                description="Do you seek out climbs or prefer flat routes?"
                value={hillPreference}
                onChange={setHillPreference}
                data={[
                  { value: 'avoid', label: 'Avoid - Keep it flat' },
                  { value: 'moderate', label: 'Moderate - Some hills okay' },
                  { value: 'seek', label: 'Seek - Love climbing!' },
                ]}
              />
              
              <div>
                <Text size="sm" fw={500} mb={5}>
                  Maximum Comfortable Gradient: {maxGradient}%
                </Text>
                <Slider
                  value={maxGradient}
                  onChange={setMaxGradient}
                  min={5}
                  max={20}
                  marks={[
                    { value: 5, label: '5%' },
                    { value: 10, label: '10%' },
                    { value: 15, label: '15%' },
                    { value: 20, label: '20%' },
                  ]}
                />
              </div>
              
              <Select
                label="Turn Complexity"
                description="Simple routes or technical navigation?"
                value={turningPreference}
                onChange={setTurningPreference}
                data={[
                  { value: 'minimal_turns', label: 'Minimal - Straightforward routes' },
                  { value: 'varied', label: 'Varied - Mix of turns' },
                  { value: 'technical', label: 'Technical - Complex navigation' },
                ]}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="surface" pt="md">
            <Stack>
              <Select
                label="Surface Quality"
                description="Minimum acceptable road surface quality"
                value={surfaceQuality}
                onChange={setSurfaceQuality}
                data={[
                  { value: 'excellent', label: 'Excellent - Smooth pavement only' },
                  { value: 'good', label: 'Good - Minor imperfections okay' },
                  { value: 'fair', label: 'Fair - Rough roads acceptable' },
                  { value: 'poor_ok', label: 'Any - Adventure ready' },
                ]}
              />
              
              <div>
                <Text size="sm" fw={500} mb={5}>
                  Gravel Tolerance: {gravelTolerance}% of route
                </Text>
                <Slider
                  value={gravelTolerance}
                  onChange={setGravelTolerance}
                  min={0}
                  max={50}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                  ]}
                />
              </div>
              
              <Switch
                label="Paved roads only in wet weather"
                description="Avoid unpaved surfaces when it's raining"
                checked={wetWeatherPavedOnly}
                onChange={(e) => setWetWeatherPavedOnly(e.currentTarget.checked)}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="safety" pt="md">
            <Stack>
              <Select
                label="Bike Infrastructure"
                description="Importance of bike lanes and paths"
                value={bikeInfrastructure}
                onChange={setBikeInfrastructure}
                data={[
                  { value: 'required', label: 'Required - Must have bike infrastructure' },
                  { value: 'strongly_preferred', label: 'Strongly Preferred' },
                  { value: 'preferred', label: 'Preferred but flexible' },
                  { value: 'flexible', label: 'Flexible - Any road is fine' },
                ]}
              />
              
              <div>
                <Text size="sm" fw={500} mb={5}>
                  Rest Stop Frequency: Every {restStopFrequency} km
                </Text>
                <Slider
                  value={restStopFrequency}
                  onChange={setRestStopFrequency}
                  min={5}
                  max={30}
                  step={5}
                  marks={[
                    { value: 5, label: '5km' },
                    { value: 15, label: '15km' },
                    { value: 30, label: '30km' },
                  ]}
                />
              </div>
              
              <Select
                label="Cell Coverage"
                description="How important is phone signal?"
                value={cellCoverage}
                onChange={setCellCoverage}
                data={[
                  { value: 'critical', label: 'Critical - Always needed' },
                  { value: 'important', label: 'Important - Mostly needed' },
                  { value: 'nice_to_have', label: 'Nice to have' },
                  { value: 'not_important', label: 'Not important' },
                ]}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="scenic" pt="md">
            <Stack>
              <Select
                label="Scenic Importance"
                description="How much do views matter?"
                value={scenicImportance}
                onChange={setScenicImportance}
                data={[
                  { value: 'critical', label: 'Critical - Must be beautiful' },
                  { value: 'important', label: 'Important - Prefer scenic' },
                  { value: 'nice_to_have', label: 'Nice to have' },
                  { value: 'not_important', label: 'Not important - Just ride' },
                ]}
              />
              
              <MultiSelect
                label="Preferred Views"
                description="What scenery do you enjoy?"
                value={preferredViews}
                onChange={setPreferredViews}
                data={[
                  { value: 'nature', label: 'Nature' },
                  { value: 'water', label: 'Water views' },
                  { value: 'mountains', label: 'Mountains' },
                  { value: 'rolling_hills', label: 'Rolling hills' },
                  { value: 'farmland', label: 'Farmland' },
                  { value: 'urban', label: 'Urban' },
                  { value: 'historic', label: 'Historic sites' },
                ]}
              />
              
              <Switch
                label="Photography stops"
                description="Include photo-worthy locations"
                checked={photographyStops}
                onChange={(e) => setPhotographyStops(e.currentTarget.checked)}
              />
              
              <Select
                label="Quietness Level"
                description="Preference for peaceful routes"
                value={quietnessLevel}
                onChange={setQuietnessLevel}
                data={[
                  { value: 'high', label: 'High - Very quiet roads' },
                  { value: 'medium', label: 'Medium - Some noise okay' },
                  { value: 'low', label: 'Low - Noise not a concern' },
                ]}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="training" pt="md">
            <Stack>
              <Select
                label="Training Phase"
                description="Current training cycle phase"
                value={trainingPhase}
                onChange={setTrainingPhase}
                data={[
                  { value: 'base_building', label: 'Base Building' },
                  { value: 'build', label: 'Build Phase' },
                  { value: 'peak', label: 'Peak/Race Phase' },
                  { value: 'recovery', label: 'Recovery' },
                  { value: 'maintenance', label: 'Maintenance' },
                ]}
              />
              
              <div>
                <Text size="sm" fw={500} mb={5}>
                  Weekly Volume: {weeklyVolume} km
                </Text>
                <Slider
                  value={weeklyVolume}
                  onChange={setWeeklyVolume}
                  min={25}
                  max={500}
                  step={25}
                  marks={[
                    { value: 50, label: '50' },
                    { value: 200, label: '200' },
                    { value: 350, label: '350' },
                    { value: 500, label: '500' },
                  ]}
                />
              </div>
              
              <Select
                label="Current Fatigue Level"
                description="How fresh are your legs?"
                value={fatigueLevel}
                onChange={setFatigueLevel}
                data={[
                  { value: 'fresh', label: 'Fresh - Ready for anything' },
                  { value: 'moderate', label: 'Moderate - Normal tiredness' },
                  { value: 'tired', label: 'Tired - Need easier rides' },
                  { value: 'exhausted', label: 'Exhausted - Recovery only' },
                ]}
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>
        
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Preferences
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default PreferenceSettings;