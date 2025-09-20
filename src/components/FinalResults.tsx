import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Star, 
  Target, 
  TrendingUp, 
  Award, 
  RefreshCw, 
  FileText, 
  Code, 
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateFinalFeedback } from '@/services/ai-service';

interface FinalResultsProps {
  company: string;
  role: string;
  scores: { [key: string]: number };
  sessionId: string;
  onRestart: () => void;
}

interface Feedback {
  overall_score: number;
  performance_analysis: string;
  strengths: string[];
  areas_for_improvement: string[];
  company_specific_feedback: string;
  next_steps: string[];
  confidence_rating: number;
}

const FinalResults: React.FC<FinalResultsProps> = ({ 
  company, 
  role, 
  scores, 
  sessionId, 
  onRestart 
}) => {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generateFeedback();
  }, []);

  const generateFeedback = async () => {
    try {
      setLoading(true);
      
      const feedback = await generateFinalFeedback(company, role, scores);
      setFeedback(feedback);
    } catch (error) {
      console.error('Error generating feedback:', error);
      toast({
        title: "Error",
        description: "Failed to generate detailed feedback. Please check your OpenAI API key.",
        variant: "destructive",
      });
      
      // Fallback basic feedback
      const avgScore = Math.round((scores.aptitude + scores.coding + scores.interview) / 3);
      setFeedback({
        overall_score: avgScore,
        performance_analysis: `You completed all three rounds of the ${company} ${role} interview simulation with an average score of ${avgScore}%.`,
        strengths: ["Completed all rounds", "Good overall performance"],
        areas_for_improvement: ["Continue practicing", "Review weak areas"],
        company_specific_feedback: `Your performance shows readiness for ${company} interview process.`,
        next_steps: ["Practice more problems", "Review interview techniques"],
        confidence_rating: Math.min(10, Math.max(1, Math.round(avgScore / 10)))
      });
    } finally {
      setLoading(false);
    }
  };

  const roundDetails = [
    {
      id: 'aptitude',
      name: 'Aptitude Round',
      icon: FileText,
      score: scores.aptitude || 0,
      maxScore: 100,
      description: 'Logical reasoning & quantitative aptitude'
    },
    {
      id: 'coding',
      name: 'Coding Round', 
      icon: Code,
      score: scores.coding || 0,
      maxScore: 100,
      description: 'Programming challenges & problem solving'
    },
    {
      id: 'interview',
      name: 'AI Interview',
      icon: MessageSquare,
      score: scores.interview || 0,
      maxScore: 100,
      description: 'Communication & technical discussion'
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', variant: 'default' as const, color: 'bg-green-500' };
    if (score >= 80) return { label: 'Very Good', variant: 'default' as const, color: 'bg-blue-500' };
    if (score >= 70) return { label: 'Good', variant: 'secondary' as const, color: 'bg-yellow-500' };
    if (score >= 60) return { label: 'Fair', variant: 'secondary' as const, color: 'bg-orange-500' };
    return { label: 'Needs Improvement', variant: 'destructive' as const, color: 'bg-red-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Analyzing Your Performance</h2>
          <p className="text-muted-foreground">Our AI is generating personalized feedback...</p>
        </div>
      </div>
    );
  }

  const overallScore = feedback?.overall_score || Math.round((scores.aptitude + scores.coding + scores.interview) / 3);
  const scoreBadge = getScoreBadge(overallScore);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-2">Interview Complete!</h1>
        <p className="text-xl text-muted-foreground mb-4">
          {company} - {role} Position
        </p>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-6xl font-bold text-primary">{overallScore}%</div>
          <div className="text-center">
            <Badge className={scoreBadge.color + " text-white"}>{scoreBadge.label}</Badge>
            <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
          </div>
        </div>
      </div>

      {/* Round Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roundDetails.map((round) => (
          <Card key={round.id}>
            <CardHeader className="text-center">
              <round.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">{round.name}</CardTitle>
              <CardDescription>{round.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(round.score)}`}>
                {round.score}%
              </div>
              <Progress value={round.score} className="mb-2" />
              <Badge variant={getScoreBadge(round.score).variant}>
                {getScoreBadge(round.score).label}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {feedback && (
        <>
          {/* Performance Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed">{feedback.performance_analysis}</p>
            </CardContent>
          </Card>

          {/* Strengths and Areas for Improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <Star className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-amber-600">
                  <Target className="w-5 h-5 mr-2" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.areas_for_improvement.map((area, index) => (
                    <li key={index} className="flex items-start">
                      <TrendingUp className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Company Specific Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                {company} Interview Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span>Confidence Rating</span>
                  <span className="font-bold">{feedback.confidence_rating}/10</span>
                </div>
                <Progress value={feedback.confidence_rating * 10} />
              </div>
              <p className="leading-relaxed">{feedback.company_specific_feedback}</p>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {feedback.next_steps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Buttons */}
      <div className="text-center space-x-4">
        <Button onClick={onRestart} size="lg" variant="outline">
          <RefreshCw className="mr-2 h-5 w-5" />
          Start New Interview
        </Button>
        <Button onClick={() => window.print()} size="lg">
          <FileText className="mr-2 h-5 w-5" />
          Save Results
        </Button>
      </div>
    </div>
  );
};

export default FinalResults;