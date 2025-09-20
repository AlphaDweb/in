import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Code, Play, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateCodingProblems, evaluateCodeSolution } from '@/services/ai-service';

interface Problem {
  title: string;
  description: string;
  example_input: string;
  example_output: string;
  test_cases: Array<{ input: string; expected_output: string }>;
  difficulty: string;
  tags: string[];
}

interface CodingRoundProps {
  company: string;
  role: string;
  sessionId: string;
  onRoundComplete: (score: number) => void;
}

const CodingRound: React.FC<CodingRoundProps> = ({ company, role, sessionId, onRoundComplete }) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [solutions, setSolutions] = useState<{ [key: number]: string }>({});
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes in seconds
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [testResults, setTestResults] = useState<{ [key: number]: boolean }>({});
  const [evaluationResults, setEvaluationResults] = useState<{ [key: number]: any }>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const { toast } = useToast();

  const languages = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
  ];

  useEffect(() => {
    loadProblems();
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !showResults) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResults) {
      handleSubmit();
    }
  }, [timeLeft, showResults]);

  const loadProblems = async () => {
    try {
      const data = await generateCodingProblems(company, role);
      setProblems(data.problems);
      setLoading(false);
    } catch (error) {
      console.error('Error loading problems:', error);
      toast({
        title: "Error",
        description: "Failed to load coding problems. Please check your OpenAI API key.",
        variant: "destructive",
      });
    }
  };

  const handleCodeChange = (problemIndex: number, code: string) => {
    setSolutions(prev => ({
      ...prev,
      [problemIndex]: code
    }));
  };

  const testCode = async () => {
    const currentSolution = solutions[currentProblemIndex] || '';
    const currentProblem = problems[currentProblemIndex];
    
    if (!currentSolution.trim()) {
      toast({
        title: "No Code",
        description: "Please write some code before testing.",
        variant: "destructive",
      });
      return;
    }

    if (!currentProblem) {
      toast({
        title: "Error",
        description: "Problem not found. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsEvaluating(true);
    
    try {
      const evaluation = await evaluateCodeSolution(
        currentProblem.title,
        currentProblem.description,
        currentProblem.test_cases || [],
        currentSolution,
        selectedLanguage
      );

      setEvaluationResults(prev => ({
        ...prev,
        [currentProblemIndex]: evaluation
      }));

      setTestResults(prev => ({
        ...prev,
        [currentProblemIndex]: evaluation.is_correct
      }));

      if (evaluation.is_correct) {
        toast({
          title: "Test Passed! ✅",
          description: `Score: ${evaluation.score}/100 - ${evaluation.feedback}`,
        });
      } else {
        toast({
          title: "Test Failed ❌",
          description: `Score: ${evaluation.score}/100 - ${evaluation.feedback}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error evaluating code:', error);
      toast({
        title: "Evaluation Error",
        description: "Failed to evaluate code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSubmit = () => {
    let solvedCount = 0;
    problems.forEach((_, index) => {
      if (testResults[index]) {
        solvedCount++;
      }
    });

    const finalScore = Math.round((solvedCount / problems.length) * 100);
    setScore(finalScore);
    setShowResults(true);
    onRoundComplete(finalScore);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getLanguageTemplate = (language: string) => {
    switch (language) {
      case 'python':
        return '# Write your Python solution here\ndef solve():\n    # Your code here\n    pass';
      case 'javascript':
        return '// Write your JavaScript solution here\nfunction solve() {\n    // Your code here\n}';
      case 'java':
        return '// Write your Java solution here\npublic class Solution {\n    public void solve() {\n        // Your code here\n    }\n}';
      case 'cpp':
        return '// Write your C++ solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}';
      case 'c':
        return '// Write your C solution here\n#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}';
      default:
        return '// Write your solution here';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Generating your coding problems...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-3xl">Coding Round Complete!</CardTitle>
            <CardDescription>
              You scored {score}% on the {company} {role} coding test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-6xl font-bold text-primary mb-4">{score}/100</div>
            <p className="text-muted-foreground mb-6">
              You solved {Object.values(testResults).filter(Boolean).length} out of {problems.length} problems.
            </p>
            <Button onClick={() => window.history.back()} size="lg">
              Continue to Next Round
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentProblem = problems[currentProblemIndex];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Coding Round</h1>
            <p className="text-muted-foreground">{company} - {role}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Clock className="w-4 h-4 mr-2" />
              {formatTime(timeLeft)}
            </Badge>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {currentProblemIndex + 1} / {problems.length}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Code className="w-5 h-5 mr-2" />
                  {currentProblem.title}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{currentProblem.difficulty}</Badge>
                  {currentProblem.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-auto">
              <div>
                <h4 className="font-semibold mb-2">Problem Description:</h4>
                <p className="text-sm leading-relaxed whitespace-pre-line">{currentProblem.description}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Example:</h4>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <div><strong>Input:</strong> {currentProblem.example_input}</div>
                  <div><strong>Output:</strong> {currentProblem.example_output}</div>
                </div>
              </div>

              {currentProblem.test_cases && (
                <div>
                  <h4 className="font-semibold mb-2">Test Cases:</h4>
                  {currentProblem.test_cases.slice(0, 2).map((testCase, index) => (
                    <div key={index} className="bg-muted p-3 rounded-md text-sm mb-2">
                      <div><strong>Input:</strong> {testCase.input}</div>
                      <div><strong>Expected:</strong> {testCase.expected_output}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={testCode} variant="outline" disabled={isEvaluating}>
              {isEvaluating ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-primary border-t-transparent rounded-full" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Test Code
                </>
              )}
            </Button>
            
            {testResults[currentProblemIndex] && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-4 h-4 mr-1" />
                Passed
              </Badge>
            )}
          </div>

          <Card className="flex-1">
            <CardContent className="p-0">
              <Textarea
                value={solutions[currentProblemIndex] || getLanguageTemplate(selectedLanguage)}
                onChange={(e) => handleCodeChange(currentProblemIndex, e.target.value)}
                className="min-h-[400px] font-mono text-sm border-0 resize-none"
                placeholder={getLanguageTemplate(selectedLanguage)}
              />
            </CardContent>
          </Card>

          {/* Evaluation Results */}
          {evaluationResults[currentProblemIndex] && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className={`w-5 h-5 mr-2 ${evaluationResults[currentProblemIndex].is_correct ? 'text-green-500' : 'text-red-500'}`} />
                  Evaluation Results
                  <Badge variant={evaluationResults[currentProblemIndex].is_correct ? "default" : "destructive"} className="ml-2">
                    {evaluationResults[currentProblemIndex].score}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Feedback:</h4>
                  <p className="text-sm text-muted-foreground">{evaluationResults[currentProblemIndex].feedback}</p>
                </div>
                
                {evaluationResults[currentProblemIndex].test_results && (
                  <div>
                    <h4 className="font-semibold mb-2">Test Case Results:</h4>
                    <div className="space-y-2">
                      {evaluationResults[currentProblemIndex].test_results.map((result: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Test Case {result.test_case}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={result.passed ? "default" : "destructive"}>
                              {result.passed ? "PASS" : "FAIL"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Expected: {result.expected} | Got: {result.actual}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evaluationResults[currentProblemIndex].suggestions && evaluationResults[currentProblemIndex].suggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Suggestions:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {evaluationResults[currentProblemIndex].suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentProblemIndex(Math.max(0, currentProblemIndex - 1))}
              disabled={currentProblemIndex === 0}
            >
              Previous Problem
            </Button>
            
            {currentProblemIndex === problems.length - 1 ? (
              <Button onClick={handleSubmit}>
                Submit Solutions
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentProblemIndex(Math.min(problems.length - 1, currentProblemIndex + 1))}
              >
                Next Problem
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingRound;