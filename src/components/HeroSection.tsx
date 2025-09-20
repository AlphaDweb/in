import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Brain, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 hero-gradient opacity-90" />
      
      {/* Background image overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center text-white">
          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Master Your Next
            <span className="block bg-gradient-to-r from-white to-accent-foreground bg-clip-text text-transparent">
              Interview
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed">
            AI-powered interview preparation platform that simulates real company interviews. 
            Get personalized feedback, practice coding challenges, and boost your confidence.
          </p>
          
          {/* CTA button */}
          <div className="flex justify-center mb-12">
            <Link to="/dashboard">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 elegant-shadow hover:scale-105 transition-all duration-300">
                Start Interview Prep
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="flex flex-col items-center p-6 backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20">
              <Target className="h-8 w-8 mb-3 text-accent-foreground" />
              <div className="text-2xl font-bold">95%</div>
              <div className="text-sm opacity-90">Success Rate</div>
            </div>
            <div className="flex flex-col items-center p-6 backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20">
              <Brain className="h-8 w-8 mb-3 text-accent-foreground" />
              <div className="text-2xl font-bold">50K+</div>
              <div className="text-sm opacity-90">Questions</div>
            </div>
            <div className="flex flex-col items-center p-6 backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20">
              <TrendingUp className="h-8 w-8 mb-3 text-accent-foreground" />
              <div className="text-2xl font-bold">500+</div>
              <div className="text-sm opacity-90">Companies</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;