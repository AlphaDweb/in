import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ResumeUploadProps {
  resumeUploaded: boolean;
  setResumeUploaded: (uploaded: boolean) => void;
  setResumeData?: (data: string) => void;
  setProjects?: (projects: string[]) => void;
}

const ResumeUpload = ({ resumeUploaded, setResumeUploaded, setResumeData, setProjects }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files[0]);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadedFile(file);
    setIsAnalyzing(true);

    // Simulate AI analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setResumeUploaded(true);
      
      // Mock resume data extraction
      const mockResumeData = `Software Engineer with 5+ years of experience in full-stack development. 
      Proficient in JavaScript, React, Node.js, Python, and cloud technologies. 
      Previous experience at tech companies including building scalable web applications, 
      leading development teams, and implementing CI/CD pipelines. 
      Strong background in system design, database optimization, and agile methodologies.`;
      
      const mockProjects = [
        "E-commerce Platform - React, Node.js, MongoDB",
        "Real-time Chat Application - WebSocket, Express.js",
        "Machine Learning API - Python, Flask, TensorFlow",
        "Mobile App Backend - Node.js, PostgreSQL, AWS"
      ];
      
      if (setResumeData) setResumeData(mockResumeData);
      if (setProjects) setProjects(mockProjects);
      
      toast.success("Resume analyzed successfully!");
    }, 3000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Resume Upload</CardTitle>
            <CardDescription>Upload your resume for AI analysis</CardDescription>
          </div>
          {resumeUploaded && (
            <CheckCircle className="h-6 w-6 text-success ml-auto" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!resumeUploaded ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isAnalyzing ? (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <AlertCircle className="h-6 w-6 text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Analyzing Resume...</h3>
                  <p className="text-sm text-muted-foreground">
                    Our AI is extracting key skills and experience from your resume
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {uploadedFile ? uploadedFile.name : "Drop your resume here"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse files
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="resume-upload"
                />
                <Button asChild variant="outline">
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    Choose File
                  </label>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports PDF, DOC, DOCX (Max 5MB)
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="p-4 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Resume Analyzed</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">File:</span>
                <Badge variant="secondary">{uploadedFile?.name}</Badge>
              </div>
              
              <div className="text-sm">
                <p className="font-medium mb-2">AI Analysis Results:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Detected 5+ years experience</li>
                  <li>• Key skills: JavaScript, React, Python</li>
                  <li>• Previous roles at tech companies</li>
                  <li>• Strong educational background</li>
                </ul>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => {
                setResumeUploaded(false);
                setUploadedFile(null);
              }}
            >
              Upload Different Resume
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResumeUpload;