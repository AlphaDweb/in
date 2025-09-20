import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Code, MessageSquare, FileText, Timer, Award } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Smart resume analysis and personalized question generation based on your target company and role."
  },
  {
    icon: FileText,
    title: "Aptitude Testing",
    description: "Company-specific aptitude questions in a strict exam environment with video monitoring."
  },
  {
    icon: Code,
    title: "Coding Challenges",
    description: "Real-time coding problems with multi-language support and automated test case evaluation."
  },
  {
    icon: MessageSquare,
    title: "AI Mock Interviews",
    description: "Interactive technical and HR interviews with AI-powered communication assessment."
  },
  {
    icon: Timer,
    title: "Realistic Environment",
    description: "Timed assessments, full-screen mode, and authentic interview conditions."
  },
  {
    icon: Award,
    title: "Detailed Feedback",
    description: "Comprehensive scoring and personalized improvement recommendations."
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Complete Interview
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Experience</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Three comprehensive rounds designed to mirror real company interview processes
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="card-shadow hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center mb-4">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;