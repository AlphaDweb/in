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
import { dbService } from '@/services/db-service';

interface FinalResultsProps {
  company: string;
  role: string;
  scores: { [key: string]: number };
  sessionId: string;
  onRestart: () => void;
}

interface Feedback {
  overall_summary: string;
  performance_breakdown: {
    aptitude: string;
    coding: string;
    interview: string;
  };
  mistakes_identified: string[];
  skill_gaps: string[];
  improvement_suggestions: string[];
  readiness_recommendation: "Ready" | "Partially Ready" | "Not Ready";
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

      const feedbackData = await generateFinalFeedback(company, role, scores as { aptitude: number; coding: number; interview: number });
      setFeedback(feedbackData);

      // Save to DB
      if (sessionId && !sessionId.startsWith('session_')) {
        dbService.saveFinalFeedback(sessionId, feedbackData).catch(console.error);
      }
    } catch (error) {
      console.error('Error generating feedback:', error);
      toast({
        title: "Evaluation Error",
        description: "Failed to generate critical report. Showing summary instead.",
        variant: "destructive",
      });

      // Fallback
      setFeedback({
        overall_summary: "Interview rounds completed. Analysis failed due to API limits.",
        performance_breakdown: {
          aptitude: `Aptitude Score: ${scores.aptitude}%`,
          coding: `Coding Score: ${scores.coding}%`,
          interview: `Interview Score: ${scores.interview}%`
        },
        mistakes_identified: ["Specific analysis unavailable"],
        skill_gaps: ["Specific gaps unavailable"],
        improvement_suggestions: ["Review your answers manually", "Retake rounds if needed"],
        readiness_recommendation: scores.coding > 70 ? "Partially Ready" : "Not Ready",
        confidence_rating: 5
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

  const getReadinessColor = (rec: string) => {
    switch (rec) {
      case 'Ready': return 'bg-green-500 hover:bg-green-600';
      case 'Partially Ready': return 'bg-yellow-500 hover:bg-yellow-600';
      default: return 'bg-red-500 hover:bg-red-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Lead Auditor Review</h2>
          <p className="text-muted-foreground animate-pulse italic">Auditing your performance, code logic, and interview sentiment...</p>
        </div>
      </div>
    );
  }

  const overallScore = Math.round(((scores.aptitude || 0) + (scores.coding || 0) + (scores.interview || 0)) / 3);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in duration-1000">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
          <Award className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Final Assessment Report</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Comprehensive evaluation for the <span className="text-primary font-bold">{role}</span> candidate at <span className="font-bold text-white">{company}</span>.
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-6">
          <div className="text-center">
            <div className="text-7xl font-black text-primary tracking-tighter">{overallScore}%</div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mt-2">Overall Score</p>
          </div>
          <div className="h-16 w-px bg-border hidden md:block"></div>
          <div className="text-center">
            <Badge className={`${getReadinessColor(feedback?.readiness_recommendation || 'Not Ready')} text-white px-6 py-2 text-lg font-bold rounded-full uppercase tracking-tighter shadow-lg border-none`}>
              {feedback?.readiness_recommendation || 'Evaluation Required'}
            </Badge>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mt-3">Readiness Rating</p>
          </div>
        </div>
      </div>

      {/* Critical Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feedback Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Executive Summary */}
          <Card className="border-2 border-primary/20 overflow-hidden bg-white/5 backdrop-blur-sm">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center text-primary uppercase tracking-widest text-xs font-bold">
                <FileText className="w-4 h-4 mr-2" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed font-medium text-gray-200 italic">
                "{feedback?.overall_summary}"
              </p>
            </CardContent>
          </Card>

          {/* Performance Breakdown Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'aptitude', name: 'Aptitude', icon: FileText, score: scores.aptitude, feedback: feedback?.performance_breakdown.aptitude },
              { id: 'coding', name: 'Coding', icon: Code, score: scores.coding, feedback: feedback?.performance_breakdown.coding },
              { id: 'interview', name: 'AI Interview', icon: MessageSquare, score: scores.interview, feedback: feedback?.performance_breakdown.interview }
            ].map((round) => (
              <Card key={round.id} className="relative group hover:border-primary/50 transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <round.icon className="w-6 h-6 text-primary" />
                    <span className={`text-2xl font-bold ${getScoreColor(round.score || 0)}`}>{round.score}%</span>
                  </div>
                  <CardTitle className="text-sm font-bold uppercase tracking-tighter pt-2 text-gray-300">{round.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={round.score} className="h-1.5 mb-3 bg-white/10" />
                  <p className="text-[10px] text-muted-foreground line-clamp-3 italic">"{round.feedback}"</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Mistakes & Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-red-500 text-base font-bold uppercase tracking-tight">
                  <Target className="w-5 h-5 mr-2" />
                  Mistakes Identified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feedback?.mistakes_identified.map((mistake, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-gray-300 bg-white/5 p-3 rounded-lg border border-red-500/10 shadow-sm">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                      {mistake}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-500 text-base font-bold uppercase tracking-tight">
                  <Star className="w-5 h-5 mr-2" />
                  Skill Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {feedback?.skill_gaps.map((gap, idx) => (
                    <Badge key={idx} variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-400 px-3 py-1">
                      {gap}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Interviewer's Confidence */}
          <Card className="bg-gradient-to-br from-gray-900 to-black text-white border-white/10 overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Star className="w-20 h-20 fill-current" />
            </div>
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary">Auditor Confidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="text-6xl font-black text-white tracking-tighter">{feedback?.confidence_rating}</div>
                <div className="text-[10px] font-bold uppercase text-gray-400 leading-tight">Out of 10<br />Data Points Analyzed</div>
              </div>
              <Progress value={(feedback?.confidence_rating || 0) * 10} className="h-2 bg-white/10" />
              <p className="text-[10px] text-gray-500 italic">This rating represents the auditor's certainty in this assessment based on your answers and code precision.</p>
            </CardContent>
          </Card>

          {/* Action Roadmap */}
          <Card className="shadow-2xl bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="text-sm uppercase tracking-widest font-bold text-white">Improvement Roadmap</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {feedback?.improvement_suggestions.map((step, index) => (
                  <div key={index} className="flex gap-4 group">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs group-hover:bg-primary group-hover:text-white transition-all">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-400 font-medium leading-tight pt-1">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                <Button onClick={onRestart} className="w-full h-11 font-bold shadow-lg bg-primary hover:bg-primary/90" variant="default">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restart Assessment
                </Button>
                <Button onClick={() => window.print()} variant="outline" className="w-full h-11 border-white/10 bg-transparent hover:bg-white/5 text-gray-400">
                  <FileText className="mr-2 h-4 w-4" />
                  Download PDF Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FinalResults;