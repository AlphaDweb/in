import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Bot, 
  User, 
  CheckCircle, 
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Send
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateAIInterviewResponse } from '@/services/ai-service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceAIInterviewRoundProps {
  company: string;
  role: string;
  sessionId: string;
  onRoundComplete: (score: number) => void;
  resumeData?: string;
  projects?: string[];
}

export default function VoiceAIInterviewRound({
  company,
  role,
  sessionId,
  onRoundComplete,
  resumeData,
  projects
}: VoiceAIInterviewRoundProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [speechRecognitionError, setSpeechRecognitionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if speech recognition is supported
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechRecognitionSupported(isSupported);

    if (!isSupported) {
      setSpeechRecognitionError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Check microphone permission
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        setMicrophonePermission(result.state as any);
      }).catch((error) => {
        console.warn('Could not check microphone permission:', error);
        setMicrophonePermission('unknown');
      });
    }

    // Initialize speech recognition
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setCurrentTranscript('');
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentTranscript(interimTranscript);
        
        if (finalTranscript) {
          setCurrentTranscript('');
          handleVoiceInput(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = "Failed to recognize speech. Please try again.";
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = "No speech detected. Please speak clearly and try again.";
            break;
          case 'audio-capture':
            errorMessage = "Microphone not accessible. Please check your microphone permissions.";
            break;
          case 'not-allowed':
            errorMessage = "Microphone permission denied. Please allow microphone access and refresh the page.";
            break;
          case 'network':
            errorMessage = "Network error. Please check your internet connection.";
            break;
          case 'aborted':
            errorMessage = "Speech recognition was aborted. Please try again.";
            break;
          case 'language-not-supported':
            errorMessage = "Language not supported. Please try again.";
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
        }
        
        setSpeechRecognitionError(errorMessage);
        toast({
          title: "Voice Recognition Error",
          description: errorMessage,
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setSpeechRecognitionError('Failed to initialize speech recognition. Please refresh the page.');
      toast({
        title: "Speech Recognition Error",
        description: "Failed to initialize voice recognition. Please use text input.",
        variant: "destructive",
      });
      setIsVoiceEnabled(false);
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (synthesisRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const speakText = (text: string) => {
    if (!isVoiceEnabled) return;
    
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!speechRecognitionSupported) {
      toast({
        title: "Voice Not Supported",
        description: "Speech recognition is not supported in this browser. Please use text input.",
        variant: "destructive",
      });
      setShowTextInput(true);
      return;
    }

    if (microphonePermission === 'denied') {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access in your browser settings and refresh the page.",
        variant: "destructive",
      });
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        // Stop any existing recognition
        recognitionRef.current.stop();
        
        // Start new recognition
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('already started')) {
          // Recognition is already running, just ignore
          return;
        }
        
        toast({
          title: "Voice Recognition Error",
          description: `Failed to start voice recognition: ${errorMessage}. Please try text input instead.`,
          variant: "destructive",
        });
        setShowTextInput(true);
      }
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    
    await handleVoiceInput(textInput);
    setTextInput('');
    setShowTextInput(false);
  };

  const retrySpeechRecognition = () => {
    setRetryCount(prev => prev + 1);
    setSpeechRecognitionError(null);
    
    // Reinitialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setCurrentTranscript('');
        };

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          setCurrentTranscript(interimTranscript);
          
          if (finalTranscript) {
            setCurrentTranscript('');
            handleVoiceInput(finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          let errorMessage = "Failed to recognize speech. Please try again.";
          
          switch (event.error) {
            case 'no-speech':
              errorMessage = "No speech detected. Please speak clearly and try again.";
              break;
            case 'audio-capture':
              errorMessage = "Microphone not accessible. Please check your microphone permissions.";
              break;
            case 'not-allowed':
              errorMessage = "Microphone permission denied. Please allow microphone access and refresh the page.";
              break;
            case 'network':
              errorMessage = "Network error. Please check your internet connection.";
              break;
            case 'aborted':
              errorMessage = "Speech recognition was aborted. Please try again.";
              break;
            case 'language-not-supported':
              errorMessage = "Language not supported. Please try again.";
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
          }
          
          setSpeechRecognitionError(errorMessage);
          toast({
            title: "Voice Recognition Error",
            description: errorMessage,
            variant: "destructive",
          });
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        toast({
          title: "Voice Recognition Retry",
          description: "Speech recognition has been reinitialized. Please try again.",
          variant: "default",
        });

      } catch (error) {
        console.error('Error reinitializing speech recognition:', error);
        setSpeechRecognitionError('Failed to reinitialize speech recognition. Please refresh the page.');
        toast({
          title: "Retry Failed",
          description: "Could not reinitialize voice recognition. Please use text input.",
          variant: "destructive",
        });
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const startInterview = async () => {
    setInterviewStarted(true);
    setIsLoading(true);

    try {
      const welcomeMessage = `Welcome to your AI interview for the ${role} position at ${company}! I'm excited to learn more about you and your background. Today we'll have a conversation about your experience, skills, and how you might fit into our team. I'll be asking you questions in different areas - starting with some basic information about yourself, then we'll discuss your experiences, and finally some technical aspects of the role. Please feel free to ask me any questions as well. Let's begin!`;
      
      setMessages([{
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);

      if (isVoiceEnabled) {
        speakText(welcomeMessage);
      }

      // Wait for user to respond before asking first question
      setIsLoading(false);

    } catch (error) {
      console.error('Error starting interview:', error);
      toast({
        title: "Error",
        description: "Failed to start interview. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim()) return;

    const userMessage = {
      role: 'user' as const,
      content: transcript,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // If this is the first user response after welcome, ask the first structured question
      if (conversationHistory.length === 1) {
        const firstQuestion = {
          role: 'assistant' as const,
          content: "Thank you for that introduction! Now let's start with our first question. Can you tell me a bit about yourself and what brings you here today?",
          timestamp: new Date()
        };

        setMessages(prev => [...prev, firstQuestion]);

        if (isVoiceEnabled) {
          speakText("Thank you for that introduction! Now let's start with our first question. Can you tell me a bit about yourself and what brings you here today?");
        }
      } else {
        // Normal AI response for subsequent interactions
        const response = await generateAIInterviewResponse(
          company,
          role,
          transcript,
          conversationHistory,
          resumeData,
          projects
        );

        const assistantMessage = {
          role: 'assistant' as const,
          content: response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (isVoiceEnabled) {
          speakText(response);
        }
      }

    } catch (error) {
      console.error('Error processing voice input:', error);
      toast({
        title: "Error",
        description: "Failed to process your response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndInterview = () => {
    const assistantQuestions = Math.max(0, messages.filter(m => m.role === 'assistant').length - 1); // exclude welcome
    const userAnswers = messages.filter(m => m.role === 'user').length;
    const totalConsidered = Math.max(assistantQuestions, 1);
    const answered = Math.min(userAnswers, assistantQuestions);
    const score = Math.round((answered / totalConsidered) * 100);
    
    setScore(score);
    setInterviewEnded(true);
    onRoundComplete(score);
  };

  if (interviewEnded) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 mr-2" />
              Interview Completed!
            </CardTitle>
            <CardDescription>
              Great job! You've completed the AI interview round.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-4">
              Score: {score}%
            </div>
            <p className="text-muted-foreground mb-4">
              You answered {Math.min(messages.filter(msg => msg.role === 'user').length, Math.max(0, messages.filter(m => m.role === 'assistant').length - 1))} out of {Math.max(0, messages.filter(m => m.role === 'assistant').length - 1)} questions.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Start New Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interview Chat */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                AI Interview - {company} {role}
              </CardTitle>
              <CardDescription>
                {interviewStarted ? 'Answer the questions below' : 'Click Start Interview to begin'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages Area - Scrollable */}
              <div className="flex-1 p-6">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            {message.role === 'assistant' && (
                              <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
                            )}
                            {message.role === 'user' && (
                              <User className="w-4 h-4 mt-1 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                          <div className="flex items-center space-x-2">
                            <Bot className="w-4 h-4" />
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Live Transcript - Fixed at bottom of messages */}
              {isListening && currentTranscript && (
                <div className="px-6 pb-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium">Listening:</p>
                    <p className="text-sm text-muted-foreground italic">{currentTranscript}</p>
                  </div>
                </div>
              )}

              {/* Controls Area - Fixed at bottom */}
              <div className="border-t bg-gray-50 p-6 space-y-4">
                {/* Error Messages */}
                {speechRecognitionError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive font-medium">Voice Recognition Error:</p>
                    <p className="text-sm text-destructive">{speechRecognitionError}</p>
                    {retryCount < 3 && (
                      <Button
                        onClick={retrySpeechRecognition}
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                      >
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Retry Voice Recognition
                      </Button>
                    )}
                  </div>
                )}

                {!speechRecognitionSupported && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-sm text-yellow-700 font-medium">Browser Not Supported:</p>
                    <p className="text-sm text-yellow-700">Please use Chrome, Edge, or Safari for voice recognition.</p>
                  </div>
                )}

                {microphonePermission === 'denied' && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive font-medium">Microphone Access Denied:</p>
                    <p className="text-sm text-destructive">Please allow microphone access in your browser settings and refresh the page.</p>
                  </div>
                )}

                {/* Voice Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading || microphonePermission === 'denied' || !speechRecognitionSupported}
                    className="w-full"
                    variant={isListening ? "destructive" : "default"}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4 mr-2" />
                        Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Start Speaking
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowTextInput(!showTextInput)}
                    variant="outline"
                    className="w-full"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {showTextInput ? 'Hide Text' : 'Use Text'}
                  </Button>

                  <Button
                    onClick={() => speechSynthesis.cancel()}
                    disabled={!isSpeaking}
                    variant="outline"
                    className="w-full"
                  >
                    {isSpeaking ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Stop Voice
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 mr-2" />
                        Voice Off
                      </>
                    )}
                  </Button>
                </div>

                {/* Text Input Fallback */}
                {showTextInput && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Type your answer:</label>
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full mt-1 p-2 border rounded-md resize-none"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleTextSubmit();
                          }
                        }}
                      />
                    </div>
                    <Button
                      onClick={handleTextSubmit}
                      disabled={!textInput.trim() || isLoading}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Answer
                    </Button>
                  </div>
                )}

                {/* End Interview Button */}
                <div className="pt-2 border-t">
                  <Button
                    onClick={handleEndInterview}
                    variant="outline"
                    className="w-full"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    End Interview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interview Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interview Tips</CardTitle>
            <CardDescription>
              Make the most of your AI interview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                <div>
                  <p className="text-sm font-medium">Speak Clearly</p>
                  <p className="text-xs text-muted-foreground">Enunciate your words and speak at a normal pace</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                <div>
                  <p className="text-sm font-medium">Be Specific</p>
                  <p className="text-xs text-muted-foreground">Provide concrete examples from your experience</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                <div>
                  <p className="text-sm font-medium">Ask Questions</p>
                  <p className="text-xs text-muted-foreground">Show interest by asking about the role and company</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                <div>
                  <p className="text-sm font-medium">Stay Calm</p>
                  <p className="text-xs text-muted-foreground">Take your time to think before responding</p>
                </div>
              </div>
            </div>

            {!interviewStarted && (
              <div className="pt-4 border-t">
                <Button
                  onClick={startInterview}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Interview
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}