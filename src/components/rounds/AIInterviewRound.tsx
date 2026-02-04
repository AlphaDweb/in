import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MessageSquare, Send, Bot, User, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateAIInterviewResponse } from '@/services/ai-service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIInterviewRoundProps {
  company: string;
  role: string;
  sessionId: string;
  onRoundComplete: (score: number) => void;
}

const AIInterviewRound: React.FC<AIInterviewRoundProps> = ({ company, role, sessionId, onRoundComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes in seconds
  const [isLoading, setIsLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [score, setScore] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (timeLeft > 0 && interviewStarted && !interviewEnded) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && interviewStarted && !interviewEnded) {
      handleEndInterview();
    }
  }, [timeLeft, interviewStarted, interviewEnded]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startInterview = async () => {
    setInterviewStarted(true);
    setIsLoading(true);

    try {
      const response = await generateAIInterviewResponse(
        company,
        role,
        `Hello! I'm here for the ${role} position interview at ${company}. I'm ready to begin.`,
        []
      );

      const initialMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    } catch (error) {
      console.error('Error starting interview:', error);
      toast({
        title: "Error",
        description: "Failed to start interview. Please check your AI API key.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage;
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await generateAIInterviewResponse(
        company,
        role,
        messageToSend,
        conversationHistory
      );

      const aiMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please check your AI API key.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEndInterview = () => {
    // Simple scoring based on message count and length
    const userMessages = messages.filter(msg => msg.role === 'user');
    const totalWords = userMessages.reduce((total, msg) => total + msg.content.split(' ').length, 0);
    const avgWordsPerMessage = totalWords / Math.max(userMessages.length, 1);

    // Score based on engagement (more messages and longer responses = better score)
    let calculatedScore = Math.min(100, Math.max(50,
      (userMessages.length * 10) + (avgWordsPerMessage * 2)
    ));

    setScore(Math.round(calculatedScore));
    setInterviewEnded(true);
    onRoundComplete(Math.round(calculatedScore));
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (interviewEnded) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-3xl">AI Interview Complete!</CardTitle>
            <CardDescription>
              You scored {score}% on the {company} {role} interview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-6xl font-bold text-primary mb-4">{score}/100</div>
            <p className="text-muted-foreground mb-6">
              Great job! The AI interviewer was impressed with your responses and communication skills.
            </p>
            <Button onClick={() => window.history.back()} size="lg">
              View Final Results
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!interviewStarted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <MessageSquare className="w-16 h-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-3xl">AI Mock Interview</CardTitle>
            <CardDescription>
              {company} - {role} Position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-left max-w-2xl mx-auto">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Interview Guidelines:</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>This is a 60-minute technical and HR interview</li>
                  <li>The AI will ask questions about your experience and technical skills</li>
                  <li>Answer naturally and professionally</li>
                  <li>Ask questions about the role and company when appropriate</li>
                  <li>Your responses will be evaluated for clarity and relevance</li>
                </ul>
              </div>

              <div className="text-center pt-6">
                <Button onClick={startInterview} size="lg" className="text-lg px-8 py-3">
                  Start Interview
                  <MessageSquare className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">AI Mock Interview</h1>
            <p className="text-muted-foreground">{company} - {role}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Clock className="w-4 h-4 mr-2" />
              {formatTime(timeLeft)}
            </Badge>
            <Button
              variant="outline"
              onClick={handleEndInterview}
              disabled={messages.filter(m => m.role === 'user').length < 3}
            >
              End Interview
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 h-[calc(100vh-200px)]">
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Live Interview Chat</CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-primary' : 'bg-muted'
                      }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>

                    <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''
                      }`}>
                      <div className={`p-3 rounded-lg text-sm ${message.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-muted'
                        }`}>
                        {message.content}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="p-3 rounded-lg bg-muted text-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isLoading}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIInterviewRound;