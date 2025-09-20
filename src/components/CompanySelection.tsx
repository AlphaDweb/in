import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle } from "lucide-react";

interface CompanySelectionProps {
  selectedCompany: string;
  setSelectedCompany: (company: string) => void;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
}

const companies = [
  "Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix", "Tesla", 
  "Uber", "Airbnb", "Spotify", "Adobe", "Salesforce", "IBM", "Oracle"
];

const roles = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Data Scientist", "Machine Learning Engineer", "Product Manager", "DevOps Engineer",
  "System Design Engineer", "Mobile Developer", "QA Engineer", "Security Engineer"
];

const CompanySelection = ({ 
  selectedCompany, 
  setSelectedCompany, 
  selectedRole, 
  setSelectedRole 
}: CompanySelectionProps) => {
  return (
    <Card className="card-shadow">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Company & Role</CardTitle>
            <CardDescription>Select your target company and role</CardDescription>
          </div>
          {selectedCompany && selectedRole && (
            <CheckCircle className="h-6 w-6 text-success ml-auto" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium">Target Company</label>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Role/Domain</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Choose your role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCompany && selectedRole && (
          <div className="p-4 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Selection Complete</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Preparing interview questions for <Badge variant="secondary">{selectedRole}</Badge> at <Badge variant="secondary">{selectedCompany}</Badge>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanySelection;