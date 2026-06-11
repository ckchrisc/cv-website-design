import React, { useState } from "react";
import { 
  Mail, Phone, Briefcase, GraduationCap, 
  ExternalLink, Globe, Award, Sparkles, FileText, Download,
  Laptop, Monitor, Palette, Code, Layers, ChevronLeft, ChevronRight
} from "lucide-react";
import { CVData } from "../types";

interface CVPreviewProps {
  data: CVData;
  primary: string;
  secondary: string;
  background: string;
}

// Utility to calculate relative luminosity for text contrast
function getLuminance(hex: string): number {
  const cleanHex = hex.replace(/^#/, "");
  if (cleanHex.length !== 6) return 0.8;
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export default function CVPreview({ data, primary, secondary, background }: CVPreviewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>("home");
  const [activePortfolioIndex, setActivePortfolioIndex] = useState<number>(0);

  // Determine if background is light or dark
  const bgLuminance = getLuminance(background);
  const isDarkBackground = bgLuminance < 0.55;

  const hasPhoto = !!(data.photoUrl && data.photoUrl.trim() !== "");

  const handlePrint = () => {
    window.print();
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${data.name.replace(/\s+/g, "_")}_portfolio_website.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Load exactly the user provided items. Do not use any defaults.
  const userPortfolios = data.portfolio || [];

  // Auto-play timer for the portfolio wall style carousel (move to next slide every 10 seconds)
  React.useEffect(() => {
    if (data.portfolioStyle === "wall" && userPortfolios.length > 1) {
      const interval = setInterval(() => {
        setActivePortfolioIndex((prev) => (prev + 1) % userPortfolios.length);
      }, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [data.portfolioStyle, userPortfolios.length, activePortfolioIndex]);

  // Get custom tags for representation matching portfolio.png
  const getCardTag = (index: number) => {
    const tags = ["COMMERCIAL", "MUSIC VIDEO", "DOCUMENTARY", "EVENT VISUAL"];
    return tags[index % tags.length];
  };

  const makeLogoText = () => {
    if (data.nickname) {
      return data.nickname.trim().toUpperCase();
    }
    if (data.name) {
      const parts = data.name.trim().split(" ");
      return parts[parts.length - 1].toUpperCase();
    }
    return "KASASIRA";
  };

  const scrollToSection = (id: string) => {
    setActiveAnchor(id);
    const element = document.getElementById(`preview-sec-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 md:p-8 relative print:bg-white print:p-0 select-none bg-slate-900/40">
      
      {/* Dynamic Floating Action Controls - Print / Export Header */}
      <div className="max-w-5xl mx-auto mb-5 flex flex-wrap gap-3 justify-end items-center print:hidden border-b border-white/5 pb-4">
        <span className="text-[11px] font-mono mr-auto text-slate-400 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block animate-pulse" style={{ backgroundColor: primary }} />
          Theme Synthesis: {primary} • {secondary} • {background}
        </span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer border border-white/10"
        >
          <FileText className="w-3.5 h-3.5 text-blue-300" /> Save PDF / Print
        </button>
        <button
          onClick={exportJSON}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer border border-white/10"
        >
          <Download className="w-3.5 h-3.5 text-emerald-300" /> Export Backup
        </button>
      </div>

      {/* Main Single-View Website Canvas */}
      <div 
        id="preview-site-canvas"
        className="max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-500 flex flex-col bg-slate-950"
        style={{ boxShadow: `0 25px 50px -12px ${primary}20` }}
      >
        
        {/* ================= HEADER MENU ================= */}
        <header 
          className="print:hidden sticky top-0 z-30 px-6 sm:px-10 py-5 flex items-center justify-between border-b border-white/15 backdrop-blur-xl"
          style={{ backgroundColor: `${background}aa` }}
        >
          {/* Logo Name */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-[0.25em] text-white hover:opacity-80 cursor-pointer">
              {makeLogoText()}
            </span>
          </div>

          {/* Navigation Links matched to the updated sequence */}
          <nav className="hidden sm:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection("home")}
              className={`text-[11px] tracking-widest font-bold uppercase transition-all hover:text-white cursor-pointer ${activeAnchor === "home" ? "text-white scale-105" : "text-slate-400"}`}
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection("about")}
              className={`text-[11px] tracking-widest font-bold uppercase transition-all hover:text-white cursor-pointer ${activeAnchor === "about" ? "text-white scale-105" : "text-slate-400"}`}
            >
              Experience
            </button>
            {userPortfolios.length > 0 && (
              <button 
                onClick={() => scrollToSection("work")}
                className={`text-[11px] tracking-widest font-bold uppercase transition-all hover:text-white cursor-pointer ${activeAnchor === "work" ? "text-white scale-105" : "text-slate-400"}`}
              >
                Portfolio
              </button>
            )}
            <button 
              onClick={() => scrollToSection("contact")}
              className={`text-[11px] tracking-widest font-bold uppercase transition-all hover:text-white cursor-pointer ${activeAnchor === "contact" ? "text-white scale-105" : "text-slate-400"}`}
            >
              Contact
            </button>
          </nav>

          {/* Contact Details on the Left of "Hire me" button */}
          <div className="flex items-center gap-5">
            {/* Quick Contacts to the left of "Hire me" */}
            <div className="hidden lg:flex items-center gap-4 text-xs font-semibold text-slate-300">
              <a 
                href={`mailto:${data.email || "hello@example.com"}`} 
                className="flex items-center gap-1.5 hover:text-white transition-all py-1 px-2.5 rounded-lg border border-white/5 bg-white/5 hover:border-white/10"
              >
                <Mail className="w-3.5 h-3.5" style={{ color: secondary }} />
                <span>{data.email || "hello@example.com"}</span>
              </a>
              {data.contactNo && (
                <span className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-white/5 bg-white/5 text-slate-300">
                  <Phone className="w-3.5 h-3.5" style={{ color: primary }} />
                  <span>{data.contactNo}</span>
                </span>
              )}
            </div>

            <div>
              <a 
                href={`mailto:${data.email || "hello@example.com"}`} 
                style={{ borderColor: `${primary}85`, backgroundColor: `${primary}15` }}
                className="text-[10px] font-bold tracking-wider px-4.5 py-2 border hover:bg-white hover:text-black rounded-full text-white transition-all duration-300 cursor-pointer flex items-center gap-1.5 active:scale-95 text-center uppercase"
              >
                CONTACT ME
              </a>
            </div>
          </div>
        </header>


        {/* ================= HERO SECTION (DARK MODE) ================= */}
        <section 
          id="preview-sec-home"
          style={{ backgroundColor: background }}
          className="relative px-6 sm:px-12 md:px-16 pt-16 pb-20 md:py-24 border-b border-white/5 overflow-hidden flex flex-col gap-14 transition-all duration-500"
        >
          {/* Subtle Ambient Radial Gradients */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-25 mix-blend-screen"
            style={{ 
              backgroundImage: `radial-gradient(circle at 75% 25%, ${primary}55 0%, transparent 60%), radial-gradient(circle at 15% 85%, ${secondary}44 0%, transparent 50%)` 
            }}
          />

          {/* Primary Split Layout: Bio details left, Portrait mockup right */}
          <div className={`flex flex-col md:flex-row items-center gap-12 w-full ${!hasPhoto ? "justify-center" : ""}`}>
            {/* Left Hero Details */}
            <div className={`flex-1 space-y-6 z-10 ${!hasPhoto ? "text-center max-w-3xl flex flex-col items-center" : "text-left"}`}>
              {data.currentPosition && (
                <span 
                  style={{ color: secondary }} 
                  className="text-xs uppercase font-bold tracking-[0.3em] block animate-pulse"
                >
                  {data.currentPosition}
                </span>
              )}

              <div className="space-y-3">
                <span className="text-xl md:text-2xl font-semibold text-slate-350 block">I&apos;m</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black text-white leading-none tracking-tight">
                  {data.name ? data.name.toUpperCase() : "CHARLES KASASIRA"},
                </h1>
              </div>

              <p className={`text-sm sm:text-base text-slate-300 leading-relaxed font-normal ${!hasPhoto ? "max-w-2xl text-center" : "max-w-xl text-left"}`}>
                {data.personalProfile || "A passionate software developer aiming to design and develop elegant digital experiences that make people's lives beautifully simple."}
              </p>

              {/* Action Buttons */}
              <div className={`pt-2 flex flex-wrap gap-4 ${!hasPhoto ? "justify-center" : ""}`}>
                {userPortfolios.length > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToSection("work")}
                    style={{ backgroundColor: primary, boxShadow: `0 10px 25px -5px ${primary}40` }}
                    className="rounded-full py-3 px-7 text-xs font-bold tracking-widest uppercase text-white hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2 border border-white/10"
                  >
                    See My Portfolio
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => scrollToSection("about")}
                  className="rounded-full py-3 px-7 text-xs font-bold tracking-widest uppercase text-slate-200 hover:text-white cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  View Experience
                </button>
              </div>
            </div>

            {/* Right Hero Image */}
            {hasPhoto && (
              <div className="w-full md:w-2/5 flex justify-center items-center z-10">
                <div className="relative group w-64 h-64 sm:w-72 sm:h-72 select-none">
                  
                  {/* Backing decorative circles & accent meshes */}
                  <div 
                    className="absolute -inset-2 rounded-full opacity-35 blur-xl group-hover:opacity-60 transition-opacity" 
                    style={{ backgroundImage: `linear-gradient(to right, ${primary}, ${secondary})` }}
                  />

                  <div className="absolute inset-2 rounded-full border border-white/15 pointer-events-none bg-slate-900/60" />

                  {/* Portrait container */}
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/20 shadow-2xl relative bg-slate-800">
                    {data.photoUrl ? (
                      <img 
                        src={data.photoUrl} 
                        alt={data.name || "Charles Kasasira"} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-501 object-center" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      // Fallback visual silhouette with glasses
                      <div className="w-full h-full flex flex-col items-center justify-end bg-gradient-to-b from-slate-950/20 via-slate-900 to-slate-950 p-6 text-center select-none">
                        <div className="absolute top-1/4 flex flex-col items-center">
                          <div className="w-20 h-10 bg-slate-400/20 rounded-t-full filter blur-xs -mb-2" />
                          <div className="flex gap-1.5 items-center justify-center opacity-70">
                            <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-white/5 flex items-center justify-center" />
                            <div className="w-4 h-0.5 bg-white/80" />
                            <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-white/5 flex items-center justify-center" />
                          </div>
                          <div className="w-5 h-2 border-b-2 border-white/50 rounded-b-lg mt-3" />
                        </div>
                        <p className="text-[10px] text-slate-450 font-mono tracking-widest uppercase mt-auto">Portrait Silhouette</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= SKILLS SET & TOOLS HUB (Under personal description, matching image.png style!) ================= */}
          <div className="w-full z-10 text-left pt-10 border-t border-white/10">
            <div className="mb-6">
              <span style={{ color: primary }} className="text-[10px] font-bold uppercase tracking-[0.25em] block mb-1">
                {data.capabilitiesTitle || "Capabilities"}
              </span>
              <h3 className="text-xl font-bold tracking-tight text-white mb-2">
                {data.capabilitiesDescription || "My Skill Sets & Professional Tools"}
              </h3>
              <p className="text-xs text-slate-400">A detailed map of roles, technical tooling, and core project management systems.</p>
            </div>

            {/* Dynamic skill categories card block matching layout reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.skillCategories && data.skillCategories.length > 0 ? (
                data.skillCategories.map((cat, catIdx) => (
                  <div key={cat.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md hover:border-white/20 hover:shadow-lg transition-all flex flex-col h-full">
                    {/* Tinted icon container */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: catIdx % 2 === 0 ? `${primary}20` : `${secondary}20` }}>
                      {cat.icon === 'sparkles' && <Sparkles className="w-5 h-5" style={{ color: catIdx % 2 === 0 ? primary : secondary }} />}
                      {cat.icon === 'laptop' && <Laptop className="w-5 h-5" style={{ color: catIdx % 2 === 0 ? primary : secondary }} />}
                      {cat.icon === 'code' && <Code className="w-5 h-5" style={{ color: catIdx % 2 === 0 ? primary : secondary }} />}
                      {cat.icon === 'palette' && <Palette className="w-5 h-5" style={{ color: catIdx % 2 === 0 ? primary : secondary }} />}
                      {cat.icon === 'layers' && <Layers className="w-5 h-5" style={{ color: catIdx % 2 === 0 ? primary : secondary }} />}
                    </div>
                    <h4 className="text-sm font-bold text-white tracking-tight mb-4">{cat.categoryName}</h4>
                    
                    <ul className="space-y-3.5 text-xs text-slate-300">
                      {cat.skills.map((skill, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catIdx % 2 === 0 ? secondary : primary }} />
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md hover:border-white/20 hover:shadow-lg transition-all flex flex-col h-full col-span-full">
                  <p className="text-xs text-slate-400 italic">No skill categories declared yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>


        {/* ================= 1. EXPERIENCE & EDUCATION TIMELINE (SWAPPED POSITION - NOW COMES FIRST) ================= */}
        <section 
          id="preview-sec-about"
          className="bg-slate-950 px-6 sm:px-12 md:px-16 py-16 text-white border-b border-white/5 relative overflow-hidden"
        >
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full filter blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: secondary }} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 z-10 relative">
            
            {/* Left Box: Experience History (Frosted styled cards) */}
            <div className="space-y-6">
              <h3 className="text-xs uppercase tracking-[0.25em] font-bold flex items-center gap-2 pb-3 border-b border-white/10" style={{ color: secondary }}>
                <Briefcase className="w-4 h-4" /> Work Experience
              </h3>

              {data.experience.length === 0 ? (
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5">
                  <p className="text-xs text-slate-400 italic">No custom experiences declared yet. Fill in the form inputs to dynamically render here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.experience.map((exp, index) => (
                    <div 
                      key={exp.id} 
                      className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-5 hover:border-white/20 transition-all group text-left"
                    >
                      <div className="flex justify-between items-start gap-4 mb-2.5">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-[#3b82f6] uppercase">
                          {exp.startYearMonth || "Year From"} - {exp.endYearMonth || "Year To"}
                        </span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondary }} />
                      </div>
                      
                      <h4 className="text-[13px] font-bold text-white mb-2">{exp.jobTitle || "Job Title"}</h4>

                      {exp.project && (
                        <h4 className="text-sm font-semibold text-white mb-2">
                          Project Focus: {exp.project}
                        </h4>
                      )}

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {exp.jobDuties || "General duties handled with client design layouts."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Box: Education History (Frosted styled cards) */}
            <div className="space-y-6">
              <h3 className="text-xs uppercase tracking-[0.25em] font-bold flex items-center gap-2 pb-3 border-b border-white/10" style={{ color: primary }}>
                <GraduationCap className="w-4 h-4" /> Education History
              </h3>

              {data.education.length === 0 ? (
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5">
                  <p className="text-xs text-slate-400 italic">No academic credentials declared yet. Fill in the form inputs to dynamically render here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.education.map((edu, index) => (
                    <div 
                      key={edu.id}
                      className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-5 hover:border-white/20 transition-all text-left"
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {edu.schoolName}
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 font-bold rounded-full text-white tracking-widest bg-white/10 border border-white/10 shrink-0">
                          {edu.startYear} - {edu.endYear}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed pt-1.5 border-t border-white/5 mt-2">
                        {edu.skillsDuties}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </section>


        {/* ================= 2. PROJECTS/PORTFOLIO SECTION ================= */}
        {userPortfolios.length > 0 && (
          <section 
            id="preview-sec-work"
            className="bg-white px-6 sm:px-12 md:px-16 py-16 sm:py-20 text-slate-900 border-b border-slate-100 text-left relative text-slate-800"
          >
            {/* Top Header layout showing ONLY "Portfolio" */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 border-b border-slate-100 pb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 uppercase">
                  Portfolio
                </h2>
              </div>
              {/* Big muted index indicator on right */}
              <div className="mt-4 sm:mt-0">
                <span className="text-5xl sm:text-6xl font-extralight tracking-widest text-slate-200/95 font-mono select-none">
                  01 |
                </span>
              </div>
            </div>

            {/* Render selected Portfolio Showcase Layout Style */}
            {data.portfolioStyle === "wall" ? (
              /* --- PORTFOLIO DYNAMIC WALL SLICER CAROUSEL --- */
              (() => {
                const activeIndex = Math.min(activePortfolioIndex, Math.max(0, userPortfolios.length - 1));
                return (
                  <div className="space-y-8 max-w-4xl mx-auto">
                    {/* Viewport Slider Frame */}
                    <div className="relative overflow-hidden rounded-3xl border border-slate-200/50 bg-slate-950 aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] shadow-xl">
                      {/* Active Sliding Track */}
                      <div 
                        className="flex h-full transition-transform duration-500 ease-out"
                        style={{ 
                          transform: `translateX(-${activeIndex * (100 / userPortfolios.length)}%)`, 
                          width: `${userPortfolios.length * 100}%` 
                        }}
                      >
                        {userPortfolios.map((port) => (
                          <div 
                            key={port.id} 
                            className="h-full relative shrink-0 overflow-hidden"
                            style={{ width: `${100 / userPortfolios.length}%` }}
                          >
                            {/* Card Background image - fulfills the box completely */}
                            <img 
                              src={port.coverPhoto || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80"}
                              alt={port.projectName}
                              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                              referrerPolicy="no-referrer"
                            />

                            {/* Extra Strong Dark Gradient Screen Overlay to ensure text description is super obvious & readable */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/25 pointer-events-none" />

                            {/* Text & Categories content: styled to be highly distinct with strong shadow rendering */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 md:p-12 z-10 text-left flex flex-col gap-4 sm:gap-5 select-none text-white">
                              <div className="text-left w-full space-y-2 sm:space-y-3">
                                <h4 className="text-xl sm:text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] tracking-tight">
                                  {port.projectName}
                                </h4>
                                <p className="text-xs sm:text-sm md:text-[14.5px] text-slate-100 font-normal leading-relaxed font-sans max-w-2xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                                  {port.description}
                                </p>
                              </div>

                              {/* Footer bar with categories and "Know More" */}
                              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-white/15 w-full min-h-[44px]">
                                {/* Render all categories: one box for each category */}
                                <div className="flex flex-wrap gap-1.5 max-w-[65%] shrink-0">
                                  {port.categories && port.categories.length > 0 ? (
                                    port.categories.map((cat, catIdx) => (
                                      <span 
                                        key={catIdx} 
                                        className="bg-white text-[9px] font-black uppercase text-slate-900 px-2.5 py-1.5 rounded-sm tracking-widest shadow-md select-none shrink-0 truncate max-w-[120px] text-center font-sans border border-slate-200"
                                      >
                                        {cat}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="bg-white text-[9px] font-black uppercase text-slate-900 px-2.5 py-1.5 rounded-sm tracking-widest shadow-md select-none shrink-0 text-center font-sans border border-slate-200">
                                      GENERAL
                                    </span>
                                  )}
                                </div>

                                {/* Know More Button - conditionally hidden if url is empty */}
                                {port.url && port.url.trim() !== "" && (
                                  <a
                                    href={port.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 active:scale-95 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-slate-250 shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0 font-sans"
                                  >
                                    <span>Know more</span>
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-900" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Manual Next / Prev Chevrons */}
                      {userPortfolios.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePortfolioIndex((prev) => (prev === 0 ? userPortfolios.length - 1 : prev - 1));
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/75 hover:text-white transition-all cursor-pointer hover:scale-120 active:scale-90 z-20 focus:outline-none"
                            title="Previous Slide"
                          >
                            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePortfolioIndex((prev) => (prev === userPortfolios.length - 1 ? 0 : prev + 1));
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/75 hover:text-white transition-all cursor-pointer hover:scale-120 active:scale-90 z-20 focus:outline-none"
                            title="Next Slide"
                          >
                            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Slicer Controller Deck at the bottom: Elegant circle dot pagination indicators */}
                    <div className="flex justify-center items-center gap-3 py-4 max-w-4xl mx-auto">
                      {userPortfolios.map((port, idx) => {
                        const isSlideActive = idx === activeIndex;
                        return (
                          <button
                            key={port.id}
                            type="button"
                            onClick={() => setActivePortfolioIndex(idx)}
                            className="rounded-full transition-all duration-300 focus:outline-none cursor-pointer hover:scale-125"
                            style={{
                              width: "5px",
                              height: "5px",
                              backgroundColor: isSlideActive ? primary : "#0c3b37",
                              opacity: isSlideActive ? 1 : 0.6,
                              transform: isSlideActive ? "scale(1.2)" : "scale(1)"
                            }}
                            title={`Go to Portfolio slide ${idx + 1}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              /* --- INDEPENDENCE PORTFOLIO METHOD (SPACIOUS SEPARATE LIST OF LARGE BLOCKS) --- */
              <div className="space-y-12 max-w-4xl mx-auto">
                {userPortfolios.map((port) => (
                  <div 
                    key={port.id} 
                    className="flex flex-col lg:flex-row gap-8 items-stretch bg-slate-50 border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {/* Cover Photo */}
                    <div className="w-full lg:w-1/2 aspect-[16/10] lg:aspect-auto rounded-2xl overflow-hidden border border-slate-200/50 relative shrink-0 bg-slate-100">
                      <img 
                        src={port.coverPhoto || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80"}
                        alt={port.projectName}
                        className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Details column */}
                    <div className="w-full lg:w-1/2 flex flex-col justify-between py-2 gap-6 text-left">
                      <div className="space-y-4">
                        {/* List individual categories in separate boxes */}
                        <div className="flex flex-wrap gap-2">
                          {port.categories && port.categories.length > 0 ? (
                            port.categories.map((cat, catIdx) => (
                              <span 
                                key={catIdx} 
                                className="bg-slate-950 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-sm tracking-wider shadow-sm select-none font-sans"
                              >
                                {cat}
                              </span>
                            ))
                          ) : (
                            <span className="bg-slate-950 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-sm tracking-wider shadow-sm select-none font-sans">
                              GENERAL
                            </span>
                          )}
                        </div>

                        <h4 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug">
                          {port.projectName}
                        </h4>

                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                          {port.description}
                        </p>
                      </div>

                      {/* Know More Button: only shown if url is not empty */}
                      {port.url && port.url.trim() !== "" && (
                        <div className="pt-2">
                          <a
                            href={port.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase rounded-lg tracking-wider shadow-md hover:shadow-slate-950/20 active:scale-95 transition-all text-center"
                          >
                            <span>Know more</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}


        {/* ================= PREVIEW CONTACT SHEET SECTION ================= */}
        <section 
          id="preview-sec-contact"
          style={{ backgroundColor: background }}
          className="px-6 sm:px-12 py-12 text-center text-white relative overflow-hidden"
        >
          <div className="max-w-xl mx-auto space-y-6">
            <h3 className="text-xl font-bold tracking-tight">
              Let&apos;s build experiences together.
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              Connect dynamically using the channels above, or trigger custom design suggestions live. Our project coordinates remain persistently active.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 text-xs font-semibold text-slate-350">
              <a href={`mailto:${data.email || "hello@example.com"}`} className="flex items-center gap-2 hover:text-white hover:underline transition-colors">
                <Mail className="w-4 h-4 text-blue-400" />
                {data.email || "hello@example.com"}
              </a>
              {data.contactNo && (
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  {data.contactNo}
                </span>
              )}
            </div>
          </div>
        </section>


        {/* ================= MINI BRANDING FOOTER ================= */}
        <footer className="bg-slate-950 py-6 px-10 text-center border-t border-white/5 text-[9px] tracking-widest uppercase font-mono text-slate-500">
          <p>© {new Date().getFullYear()} {data.name || "Charles Kasasira"}. All rights preserved. Synthesized via Gemini Studio.</p>
        </footer>

      </div>
    </div>
  );
}
