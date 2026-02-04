import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Upload,
  FileText,
  Code,
  MessageSquare,
  Play,
  CheckCircle,
  Clock,
  Star,
  Award
} from "lucide-react";
import CompanySelection from "@/components/CompanySelection";
import ResumeUpload from "@/components/ResumeUpload";
import AptitudeRound from "@/components/rounds/AptitudeRound";
import CodingRound from "@/components/rounds/CodingRound";
import VoiceAIInterviewRound from "@/components/rounds/VoiceAIInterviewRound";
import FinalResults from "@/components/FinalResults";
import { useToast } from "@/components/ui/use-toast";
import { dbService } from "@/services/db-service";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [currentStep, setCurrentStep] = useState("setup");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeData, setResumeData] = useState<string>("");
  const [projects, setProjects] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [roundScores, setRoundScores] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  const [completedRounds, setCompletedRounds] = useState<string[]>([]);

  const canStartRounds = selectedCompany && selectedRole && resumeUploaded;

  const handleStartRound = (roundId: string) => {
    setCurrentRound(roundId);
    setCurrentStep("activeRound");
  };

  const handleRoundComplete = (roundId: string, score: number) => {
    setRoundScores(prev => ({ ...prev, [roundId]: score }));

    setCompletedRounds(prev => {
      if (prev.includes(roundId)) return prev;
      const next = [...prev, roundId];

      // Navigate based on updated list
      if (next.length === 3) {
        setCurrentStep("finalResults");
      } else {
        setCurrentStep("rounds");
      }
      return next;
    });

    // Save to DB
    if (sessionId && !sessionId.startsWith('session_')) {
      dbService.saveRoundResult(sessionId, roundId, score).catch(console.error);
    }

    toast({
      title: "Round completed!",
      description: `You scored ${score}% in the ${roundId} round.`,
    });
  };

  const rounds = [
    {
      id: "aptitude",
      title: "Aptitude Round",
      description: "Company-specific aptitude questions",
      icon: FileText,
      duration: "30 minutes",
      questions: 30,
      status: canStartRounds && !completedRounds.includes("aptitude") ? "available" : completedRounds.includes("aptitude") ? "completed" : "locked",
      score: roundScores.aptitude || null
    },
    {
      id: "coding",
      title: "Coding Round",
      description: "Programming challenges tailored to your role",
      icon: Code,
      duration: "30 minutes",
      questions: 3,
      status: completedRounds.includes("aptitude") && !completedRounds.includes("coding") ? "available" : completedRounds.includes("coding") ? "completed" : "locked",
      score: roundScores.coding || null
    },
    {
      id: "interview",
      title: "AI Mock Interview",
      description: "Technical and HR interview simulation",
      icon: MessageSquare,
      duration: "10 minutes",
      questions: "Dynamic",
      status: completedRounds.includes("coding") && !completedRounds.includes("interview") ? "available" : completedRounds.includes("interview") ? "completed" : "locked",
      score: roundScores.interview || null
    }
  ];

  const renderSetupPhase = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Interview Preparation Setup</h1>
        <p className="text-xl text-muted-foreground">Let's get you ready for your dream job</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CompanySelection
          selectedCompany={selectedCompany}
          setSelectedCompany={setSelectedCompany}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
        />
        <ResumeUpload
          resumeUploaded={resumeUploaded}
          setResumeUploaded={setResumeUploaded}
          setResumeData={setResumeData}
          setProjects={setProjects}
        />
      </div>

      {canStartRounds && (
        <div className="text-center">
          <Card className="max-w-md mx-auto card-shadow">
            <CardHeader>
              <CardTitle className="text-green-600">Setup Complete!</CardTitle>
              <CardDescription>
                Ready to start your interview preparation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const userId = user?.id || '00000000-0000-0000-0000-000000000000';
                    console.log("[Dashboard] Creating interview for user:", userId);
                    const interview = await dbService.createInterview(userId, selectedCompany, selectedRole);
                    setSessionId(interview.id);
                    setCurrentStep("rounds");
                    toast({
                      title: "Database Connected",
                      description: "Your interview progress is being saved.",
                    });
                  } catch (error: any) {
                    console.error("Error creating interview:", error);
                    const fallbackId = `session_${Date.now()}`;
                    setSessionId(fallbackId);
                    setCurrentStep("rounds");
                    toast({
                      title: "Offline Mode",
                      description: `Could not save to database (${error.message || 'RLS Error'}). Your progress will be temporary.`,
                      variant: "destructive"
                    });
                  }
                }}
                className="w-full"
                size="lg"
              >
                Start Interview Rounds
                <Play className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderRoundsPhase = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Interview Rounds</h1>
        <div className="text-xl text-muted-foreground">
          Preparing for <Badge variant="secondary" className="text-base mx-1">{selectedCompany}</Badge> - {selectedRole}
        </div>
        <div className="mt-4">
          <Progress value={(completedRounds.length / 3) * 100} className="w-full max-w-md mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">{completedRounds.length}/3 rounds completed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {rounds.map((round, index) => (
          <Card key={round.id} className="card-shadow hover:shadow-lg transition-all duration-300 relative">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center">
                  <round.icon className="h-6 w-6 text-white" />
                </div>
                <Badge variant={round.status === "locked" ? "secondary" :
                  round.status === "completed" ? "default" : "default"}>
                  {round.status === "locked" ? "Locked" :
                    round.status === "completed" ? "Completed" : "Available"}
                </Badge>
              </div>
              <CardTitle className="text-xl">{round.title}</CardTitle>
              <CardDescription>{round.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{round.duration}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Questions:</span>
                <span className="font-medium">{round.questions}</span>
              </div>

              {round.score && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Score:</span>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold">{round.score}/100</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                disabled={round.status === "locked"}
                variant={round.status === "locked" ? "secondary" :
                  round.status === "completed" ? "outline" : "default"}
                onClick={() => round.status !== "locked" && handleStartRound(round.id)}
              >
                {round.status === "locked" ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Complete Previous Rounds
                  </>
                ) : round.status === "completed" ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Retake Round
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Round
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={() => setCurrentStep("setup")}>
          Back to Setup
        </Button>
      </div>
    </div>
  );

  const renderActiveRound = () => {
    switch (currentRound) {
      case "aptitude":
        return (
          <AptitudeRound
            company={selectedCompany}
            role={selectedRole}
            sessionId={sessionId}
            onRoundComplete={(score) => handleRoundComplete("aptitude", score)}
          />
        );
      case "coding":
        return (
          <CodingRound
            company={selectedCompany}
            role={selectedRole}
            sessionId={sessionId}
            onRoundComplete={(score) => handleRoundComplete("coding", score)}
          />
        );
      case "interview":
        return (
          <VoiceAIInterviewRound
            company={selectedCompany}
            role={selectedRole}
            sessionId={sessionId}
            onRoundComplete={(score) => handleRoundComplete("interview", score)}
            resumeData={resumeData}
            projects={projects}
            scores={roundScores}
          />
        );
      default:
        return null;
    }
  };

  const renderFinalResults = () => (
    <FinalResults
      company={selectedCompany}
      role={selectedRole}
      scores={roundScores}
      sessionId={sessionId}
      onRestart={() => {
        setCurrentStep("setup");
        setRoundScores({});
        setSelectedCompany("");
        setSelectedRole("");
        setResumeUploaded(false);
      }}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        {currentStep === "setup" ? renderSetupPhase() :
          currentStep === "rounds" ? renderRoundsPhase() :
            currentStep === "finalResults" ? renderFinalResults() :
              renderActiveRound()}
      </div>
    </div>
  );
};

export default Dashboard;