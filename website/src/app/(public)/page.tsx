'use client';
import Link from "next/link";
import { useState, useRef, useEffect } from 'react';
import { 
  ArrowRight, 
  Zap, 
  Shield, 
  BarChart3, 
  TerminalSquare,
  Mic,
  Square,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Sparkles,
  List,
  Type,
  Languages,
  User,
  Users,
  Plus,
  Trash2,
  Send
} from "lucide-react";

type TTSVoice = {
  id: string;
  name: string;
  type: 'default' | 'google' | 'custom' | 'child' | 'adult' | 'male' | 'female';
  language: string;
  voiceURI?: string;
  pitch: number;
  rate: number;
};

type Story = {
  id: string;
  title: string;
  text: string;
  createdAt: Date;
};

type GeneratedImage = {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
};

const voices: TTSVoice[] = [
  { id: 'v1', name: 'Alex (Male, US)', type: 'male', language: 'en-US', pitch: 1, rate: 1 },
  { id: 'v2', name: 'Sarah (Female, US)', type: 'female', language: 'en-US', pitch: 1.2, rate: 1 },
  { id: 'v3', name: 'Brian (Male, UK)', type: 'male', language: 'en-GB', pitch: 0.9, rate: 1 },
  { id: 'v4', name: 'Emma (Female, UK)', type: 'female', language: 'en-GB', pitch: 1.1, rate: 1 },
  { id: 'v5', name: 'Lila (Child, US)', type: 'child', language: 'en-US', pitch: 1.5, rate: 1.1 },
  { id: 'v6', name: 'Tommy (Child, UK)', type: 'child', language: 'en-GB', pitch: 1.4, rate: 1.05 },
  { id: 'v7', name: 'Raj (Male, India)', type: 'male', language: 'en-IN', pitch: 1, rate: 0.95 },
  { id: 'v8', name: 'Priya (Female, India)', type: 'female', language: 'en-IN', pitch: 1.2, rate: 0.95 },
  { id: 'v9', name: 'Ahmed (Male, Arabic)', type: 'male', language: 'ar-SA', pitch: 1, rate: 0.9 },
  { id: 'v10', name: 'Fatima (Female, Arabic)', type: 'female', language: 'ar-SA', pitch: 1.15, rate: 0.9 },
  { id: 'v11', name: 'Carlos (Male, Spanish)', type: 'male', language: 'es-ES', pitch: 0.95, rate: 1 },
  { id: 'v12', name: 'Sofia (Female, Spanish)', type: 'female', language: 'es-ES', pitch: 1.1, rate: 1 },
  { id: 'v13', name: 'Hiroshi (Male, Japanese)', type: 'male', language: 'ja-JP', pitch: 1, rate: 0.9 },
  { id: 'v14', name: 'Yuki (Female, Japanese)', type: 'female', language: 'ja-JP', pitch: 1.3, rate: 0.9 },
  { id: 'v15', name: 'Kai (Narrator, Deep)', type: 'adult', language: 'en-US', pitch: 0.7, rate: 0.95 },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'pos' | 'production'>('pos');
  const [textInput, setTextInput] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<TTSVoice>(voices[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(selectedVoice.rate);
  const [pitch, setPitch] = useState(selectedVoice.pitch);
  const [availableSystemVoices, setAvailableSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentStoryWordIndex, setCurrentStoryWordIndex] = useState(0);
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const [stories, setStories] = useState<Story[]>([
    { id: 's1', title: 'The Lion and the Mouse', text: 'Once upon a time, in a dense forest, a mighty lion was sleeping peacefully under a big tree. Suddenly, a tiny mouse came scurrying by and accidentally ran over the lion\'s paw. The lion woke up with a roar and caught the little mouse in his sharp claws. "You dare to disturb my sleep?" he growled angrily. "Please spare me, O King!" begged the mouse. "I will never forget your kindness. Maybe one day I will help you." The lion laughed loudly. "You? Help me? That\'s the funniest thing I\'ve ever heard!" But he felt pity for the small creature and let him go.', createdAt: new Date(Date.now() - 86400000) }
  ]);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis) {
        setAvailableSystemVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    setPlaybackRate(selectedVoice.rate);
    setPitch(selectedVoice.pitch);
  }, [selectedVoice]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current = new Audio(audioUrl);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTextToSpeech = () => {
    if (!textInput.trim()) return;
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      utteranceRef.current = new SpeechSynthesisUtterance(textInput);
      utteranceRef.current.rate = playbackRate;
      utteranceRef.current.pitch = pitch;
      
      const matchingVoice = availableSystemVoices.find(v => 
        v.lang === selectedVoice.language && 
        (selectedVoice.type === 'male' ? v.name.toLowerCase().includes('male') : 
         selectedVoice.type === 'female' ? v.name.toLowerCase().includes('female') : true)
      );
      if (matchingVoice) {
        utteranceRef.current.voice = matchingVoice;
      }
      
      setIsStoryPlaying(true);
      setCurrentStoryWordIndex(0);
      
      utteranceRef.current.onend = () => {
        setIsStoryPlaying(false);
        setCurrentStoryWordIndex(0);
      };
      
      utteranceRef.current.onboundary = (event) => {
        if (event.name === 'word') {
          setCurrentStoryWordIndex(event.charIndex);
        }
      };
      
      speechSynthesis.speak(utteranceRef.current);
    } else {
      alert('Text-to-speech not supported in your browser');
    }
  };

  const handleStopTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsStoryPlaying(false);
      setCurrentStoryWordIndex(0);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newImage: GeneratedImage = {
        id: `img-${Date.now()}`,
        prompt: imagePrompt,
        imageUrl: `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(imagePrompt)}&image_size=square_hd`,
        createdAt: new Date()
      };
      setGeneratedImages([newImage, ...generatedImages]);
      setImagePrompt('');
    } catch (err) {
      console.error('Error generating image:', err);
      alert('Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAddStory = () => {
    if (!textInput.trim()) return;
    const newStory: Story = {
      id: `story-${Date.now()}`,
      title: textInput.slice(0, 50) + (textInput.length > 50 ? '...' : ''),
      text: textInput,
      createdAt: new Date()
    };
    setStories([newStory, ...stories]);
  };

  const handleDeleteStory = (id: string) => {
    setStories(stories.filter(s => s.id !== id));
  };

  const handleDeleteImage = (id: string) => {
    setGeneratedImages(generatedImages.filter(i => i.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Main Content */}
      {activeTab === 'pos' ? (
        /* POS Features Section */
        <div className="flex-1">
          {/* Hero Section */}
          <section className="relative pt-16 pb-24 overflow-hidden">
            <div className="absolute inset-0 bg-slate-50 -z-10" />
            <div className="absolute inset-y-0 right-0 w-1/2 bg-blue-50/50 rounded-l-full -z-10 transform translate-x-1/3" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                The Modern Point of Sale <br className="hidden md:block" />
                <span className="text-blue-600">Built for Speed and Scale</span>
              </h1>
              <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto mb-10">
                Whizpoint POS streamlines your operations, manages inventory in real-time, and provides actionable insights. No cloud lock-in. Full offline support.
              </p>

              <div className="mt-16 relative mx-auto max-w-5xl">
                <div className="rounded-xl bg-slate-900/5 p-2 ring-1 ring-inset ring-slate-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                  <img 
                    src="/dash.png" 
                    alt="Whizpoint POS Dashboard Preview" 
                    className="w-full rounded-lg shadow-2xl border border-slate-200"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Everything you need to run your business
                </h2>
                <p className="mt-4 text-lg text-slate-600">
                  Powerful features packed into a clean, intuitive interface that your staff will learn in minutes.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Lightning Fast Checkout</h3>
                  <p className="text-slate-600">Optimized keyboard-first flows and fast barcode scanning. Keep the line moving, even during rush hour.</p>
                </div>
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Offline-First Reliability</h3>
                  <p className="text-slate-600">Never stop selling. Whizpoint works flawlessly without internet, syncing automatically when connection is restored.</p>
                </div>
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Advanced Reporting</h3>
                  <p className="text-slate-600">Detailed closing reports, inventory tracking, and M-Pesa integration analytics at your fingertips.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Social Proof */}
          <section className="py-24 bg-slate-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-2xl font-semibold text-slate-300 mb-10">Trusted by modern businesses</h2>
              <div className="flex flex-wrap justify-center gap-12 opacity-70">
                <div className="text-2xl font-bold flex items-center gap-2"><TerminalSquare className="w-6 h-6"/> TechMart</div>
                <div className="text-2xl font-bold flex items-center gap-2"><TerminalSquare className="w-6 h-6"/> FreshGrocer</div>
                <div className="text-2xl font-bold flex items-center gap-2"><TerminalSquare className="w-6 h-6"/> QuickServe</div>
                <div className="text-2xl font-bold flex items-center gap-2"><TerminalSquare className="w-6 h-6"/> AutoParts</div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-24 bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-blue-600 rounded-3xl p-10 md:p-16 text-center text-white shadow-xl">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to upgrade your checkout experience?</h2>
                <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
                  Get in touch with our sales team today to schedule a demo and see how Whizpoint POS can transform your operations.
                </p>
                <Link href="/contact" className="inline-flex items-center justify-center rounded-lg text-base font-medium transition-colors bg-white text-blue-600 hover:bg-slate-50 h-14 px-8 shadow-sm">
                  Contact Sales Now
                </Link>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Production Studio Section */
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
                Production Studio
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Create stunning stories with text-to-speech, record audio, and generate realistic images from prompts
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Storytelling & TTS */}
              <div className="lg:col-span-2 space-y-6">
                {/* Text Editor */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Type className="w-5 h-5 text-blue-600" />
                      <h2 className="text-xl font-bold text-slate-900">Story Editor</h2>
                    </div>
                    <button
                      onClick={handleAddStory}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Save Story
                    </button>
                  </div>
                  <div className="p-6">
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Write your story or text here..."
                      className="w-full h-64 p-4 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-800"
                    />
                  </div>
                </div>

                {/* Text-to-Speech Controls */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-blue-600" />
                      Text-to-Speech
                    </h2>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Voice
                        </label>
                        <select
                          value={selectedVoice.id}
                          onChange={(e) => setSelectedVoice(voices.find(v => v.id === e.target.value) || voices[0])}
                          className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          {voices.map(voice => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} ({voice.language})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Voice Type
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['default', 'google', 'custom', 'child', 'adult'].map(type => (
                            <button
                              key={type}
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                selectedVoice.type === type
                                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-semibold text-slate-700">Speed</label>
                          <span className="text-sm text-slate-500">{playbackRate}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={playbackRate}
                          onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-semibold text-slate-700">Pitch</label>
                          <span className="text-sm text-slate-500">{pitch}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={pitch}
                          onChange={(e) => setPitch(parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleTextToSpeech}
                      disabled={!textInput.trim()}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      <Play className="w-5 h-5" />
                      Play Text
                    </button>
                  </div>
                </div>

                {/* Audio Recorder */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-purple-600" />
                      Audio Recorder
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col items-center justify-center py-8">
                      {isRecording ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div
                                key={i}
                                className="w-2 bg-red-500 rounded-full animate-pulse"
                                style={{
                                  height: `${20 + Math.random() * 40}px`,
                                  animationDelay: `${i * 0.1}s`
                                }}
                              />
                            ))}
                          </div>
                          <button
                            onClick={handleStopRecording}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                          >
                            <Square className="w-5 h-5" />
                            Stop Recording
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4">
                          <button
                            onClick={handleStartRecording}
                            className="flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-lg"
                          >
                            <Mic className="w-6 h-6" />
                            Start Recording
                          </button>
                          {audioRef.current && (
                            <div className="flex items-center gap-4 w-full max-w-md">
                              <button
                                onClick={handlePlayAudio}
                                className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                              >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                              </button>
                              <div className="flex-1 h-2 bg-slate-200 rounded-full" />
                              <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                              >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Saved Stories */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <List className="w-5 h-5 text-emerald-600" />
                      Saved Stories
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {stories.map(story => (
                      <div key={story.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{story.title}</h3>
                          <p className="text-sm text-slate-500">
                            {new Date(story.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => setTextInput(story.text)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Type className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStory(story.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Image Generation */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      Image Generation
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Describe what you want to generate
                      </label>
                      <textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="A beautiful sunset over the ocean with palm trees..."
                        className="w-full h-32 p-4 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-slate-800"
                      />
                    </div>
                    <button
                      onClick={handleGenerateImage}
                      disabled={!imagePrompt.trim() || isGeneratingImage}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isGeneratingImage ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5" />
                          Generate Image
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Generated Images */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900">Generated Images</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-4">
                      {generatedImages.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No images generated yet</p>
                          <p className="text-sm text-slate-400 mt-2">
                            Enter a prompt above to generate your first image
                          </p>
                        </div>
                      ) : (
                        generatedImages.map(image => (
                          <div key={image.id} className="relative group rounded-xl overflow-hidden border border-slate-200">
                            <img
                              src={image.imageUrl}
                              alt={image.prompt}
                              className="w-full aspect-square object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDI1MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNjBDMTI1IDQ4Ljk1NDMgMTM0Ljk1NCA0MCAxNDYgNDBDMTU3LjA0NiA0MCAxNjcgNDguOTU0MyAxNjcgNjBDMTY3IDcxLjA0NTcgMTU3LjA0NiA4MCAxNDYgODBDMTM0Ljk1NCA4MCAxMjUgNzEuMDQ1NyAxMjUgNjBaIiBmaWxsPSIjOUI5Qjk5Ii8+CjxwYXRoIGQ9Ik02MiAxNjBDNjIgMTQ4Ljk1NCA3MS45NTQzIDE0MCA4MyAxNDBDOTQuMDQ1NyAxNDAgMTAzIDE0OC45NTQgMTAzIDE2MEMxMDMgMTcxLjA0NiA5NC4wNDU3IDE4MCA4MyAxODBDNzEuOTU0MyAxODAgNjIgMTcxLjA0NiA2MiAxNjBaIiBmaWxsPSIjOUI5Qjk5Ii8+CjxwYXRoIGQ9Ik0xODcgMTYwQzE4NyAxNDguOTU0IDE5Ni45NTQgMTQwIDIwOCAxNDBDMjE5LjA0NiAxNDAgMjI4IDE0OC45NTQgMjI4IDE2MEMyMjggMTcxLjA0NiAyMTkuMDQ2IDE4MCAyMDggMTgwQzE5Ni45NTQgMTgwIDE4NyAxNzEuMDQ2IDE4NyAxNjBaIiBmaWxsPSIjOUI5Qjk5Ii8+Cjwvc3ZnPgo=';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleDeleteImage(image.id)}
                                className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-5 h-5 text-red-600" />
                              </button>
                            </div>
                            <div className="p-4 bg-white border-t border-slate-200">
                              <p className="text-sm text-slate-600 line-clamp-2">{image.prompt}</p>
                              <p className="text-xs text-slate-400 mt-2">
                                {new Date(image.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}