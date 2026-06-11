export interface EducationItem {
  id: string;
  schoolName: string;
  startYear: string;
  endYear: string;
  skillsDuties: string;
}

export interface WorkExperienceItem {
  id: string;
  jobTitle: string; // New field
  startYearMonth: string; // New field
  endYearMonth: string; // New field
  jobDuties: string;
  project: string; // Responsible for the project (optional/if any)
}

export interface PortfolioItem {
  id: string;
  projectName: string;
  description: string;
  url: string; // Website link/youtube channel (optional)
  coverPhoto: string; // Image URL or base64 data URL
  categories: string[]; // List of categories/tags
}

export interface SkillCategory {
  id: string;
  categoryName: string;
  skills: string[];
  icon: string; // Add icon field
}

export interface CVData {
  name: string;
  nickname: string;
  email: string;
  skillCategories: SkillCategory[]; 
  capabilitiesTitle: string; // Add capabilities title
  capabilitiesDescription: string; // Add capabilities description
  contactNo: string;
  jobPosition: string; 
  currentPosition: string;
  photoUrl: string; 
  personalProfile: string;
  education: EducationItem[];
  experience: WorkExperienceItem[];
  portfolio: PortfolioItem[];
  portfolioStyle?: "independence" | "wall";
}

export interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  explanation: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
}
