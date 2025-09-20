import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Upload, Play, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Building2,
    title: "Choose Company & Role",
    description: "Select your target company and the domain/role you're applying for",
    step: "01"
  },
  {
    icon: Upload,
    title: "Upload Resume",
    description: "Our AI analyzes your resume to understand your background and skills",
    step: "02"
  },
  {
    icon: Play,
    title: "Complete 3 Rounds",
    description: "Aptitude, Coding, and AI Mock Interview rounds tailored to your selection",
    step: "03"
  },
  {
    icon: BarChart3,
    title: "Get Detailed Feedback",
    description: "Receive personalized feedback and improvement recommendations",
    step: "04"
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            How It
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to master your interview skills
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <Card key={index} className="card-shadow hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 relative">
              <CardHeader className="text-center pb-4">
                <div className="absolute -top-4 left-4 w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-full text-white text-sm font-bold flex items-center justify-center">
                  {step.step}
                </div>
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl flex items-center justify-center mb-4 mt-2">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center">
          <Link to="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6 elegant-shadow hover:scale-105 transition-all duration-300">
              Start Your Interview Preparation
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;