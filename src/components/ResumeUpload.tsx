import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { analyzeResumeText } from "@/services/ai-service";

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
  const [extractedText, setExtractedText] = useState<string>("");
  const [manualText, setManualText] = useState<string>("");
  const [usedManualEntry, setUsedManualEntry] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string>("");

  async function loadScript(src: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.head.appendChild(script);
    });
  }

  async function extractDocxText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const mammoth: any = await import('mammoth/mammoth.browser');
      const result = await mammoth.extractRawText({ arrayBuffer });
      return (result?.value || "").trim();
    } catch {
      // Fallback to CDN browser build
      await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
      // @ts-ignore
      const mammothCdn = (window as any).mammoth;
      if (!mammothCdn) throw new Error('Mammoth not available');
      const result = await mammothCdn.extractRawText({ arrayBuffer });
      return (result?.value || "").trim();
    }
  }

  async function extractPdfText(file: File): Promise<string> {
    // Always use local pdfjs-dist; resolve worker URL via Vite ?url import
    const pdfjsLib: any = await import('pdfjs-dist/build/pdf.mjs');
    const workerUrlMod: any = await import('pdfjs-dist/build/pdf.worker.mjs?url');
    const workerUrl: string = workerUrlMod?.default || workerUrlMod;
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items?.map((it: any) => it.str) || [];
      fullText += strings.join(' ') + '\n';
    }
    let trimmed = fullText.trim();
    if (trimmed.length < 20) {
      try {
        const ocr = await ocrPdfFirstPages(data, 3);
        if (ocr && ocr.length > 20) return ocr;
      } catch (e) {
        console.warn('OCR fallback failed:', e);
      }
    }
    return trimmed;
  }

  async function ocrPdfFirstPages(pdfData: Uint8Array, pages: number = 3): Promise<string> {
    const pdfjsLib: any = await import('pdfjs-dist/build/pdf.mjs');

    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    // Load Tesseract from CDN to avoid bundler resolution issues
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    // @ts-ignore
    const Tesseract = (window as any).Tesseract;
    if (!Tesseract) throw new Error('Tesseract not available');

    let ocrText = '';
    const max = Math.min(pages, pdf.numPages);
    for (let pageNum = 1; pageNum <= max; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise;

      const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
      if (text) ocrText += text + '\n';
    }

    return ocrText.trim();
  }

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

    // Validate file type (by type or extension)
    const name = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx');
    const isDoc = file.type === 'application/msword' || name.endsWith('.doc');
    const isTxt = file.type === 'text/plain' || name.endsWith('.txt');
    if (!(isPdf || isDocx || isDoc || isTxt)) {
      toast.error("Please upload a PDF, DOCX, DOC, or TXT file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadedFile(file);
    setIsAnalyzing(true);

    try {
      setAnalysisError("");
      let extracted = "";
      if (isPdf) {
        extracted = await extractPdfText(file);
      } else if (isDocx) {
        extracted = await extractDocxText(file);
      } else if (isDoc) {
        // .doc not reliably supported in-browser; prompt to convert or paste
        throw new Error('legacy-doc');
      } else if (isTxt) {
        extracted = (await file.text()).trim();
      } else {
        // Try generic text read as a fallback
        extracted = (await file.text()).trim();
      }

      if (extracted && extracted.length > 50) {
        setExtractedText(extracted);
        setResumeUploaded(true);
        try {
          const analysis = await analyzeResumeText(extracted);
          const summary = analysis.summary || extracted.slice(0, 800);
          if (setResumeData) setResumeData(summary);
          if (setProjects) setProjects(
            (analysis.projects || []).map(p => p.title || '').filter(Boolean)
          );
          toast.success("Resume analyzed successfully.");
        } catch (e) {
          console.warn("AI analysis failed, using raw text only.", e);
          if (setResumeData) setResumeData(extracted);
          if (setProjects) setProjects([]);
          toast.info("Using extracted text (AI analysis unavailable).");
        }
      } else {
        setExtractedText("");
        setResumeUploaded(true);
        setAnalysisError("Could not reliably extract text from this file. Please paste your resume text.");
        toast.info("Could not reliably extract text. Please paste your resume text for accurate analysis.");
      }
    } catch (e: any) {
      console.error("Resume text extraction failed:", e);
      setResumeUploaded(true);
      if (e && String(e.message).includes('legacy-doc')) {
        setAnalysisError(".doc files are not fully supported. Please upload a PDF/DOCX or paste your resume text.");
        toast.info(".doc not supported. Upload PDF/DOCX or paste text.");
      } else {
        setAnalysisError("Failed to read the file. Please paste your resume text.");
        toast.info("Could not read the file. Please paste your resume text for accurate analysis.");
      }
    } finally {
      setIsAnalyzing(false);
    }
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
                <p className="font-medium mb-2">Extracted Resume Text:</p>
                {extractedText ? (
                  <div className="max-h-40 overflow-auto p-2 bg-white rounded border text-muted-foreground whitespace-pre-wrap">
                    {extractedText.slice(0, 2000)}{extractedText.length > 2000 ? '…' : ''}
                  </div>
                ) : (
                  <div className="p-2 bg-white rounded border">
                    {analysisError && (
                      <p className="text-xs text-destructive mb-2">{analysisError}</p>
                    )}
                    <p className="text-xs text-muted-foreground mb-2">Paste your resume text below for accurate analysis:</p>
                    <textarea
                      className="w-full p-2 border rounded text-sm"
                      rows={6}
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Paste your resume text here..."
                    />
                    <Button
                      className="mt-2"
                      size="sm"
                      onClick={() => {
                        if (!manualText.trim()) {
                          toast.error("Please paste some text from your resume.");
                          return;
                        }
                        setUsedManualEntry(true);
                        if (setResumeData) setResumeData(manualText.trim());
                        if (setProjects) setProjects([]);
                        toast.success("Resume text saved for analysis.");
                      }}
                    >
                      Save Pasted Text
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => {
                setResumeUploaded(false);
                setUploadedFile(null);
                setExtractedText("");
                setManualText("");
                setUsedManualEntry(false);
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