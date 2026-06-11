import React, { useState, useEffect } from "react";
import { 
  Sparkles, Palette, Eye, Edit, Code, RefreshCw, 
  Check, ArrowRight, ShieldCheck, Heart, Info, HelpCircle,
  Share2, Copy, X, ExternalLink, Lock, Home
} from "lucide-react";
import { CVData, ColorPalette } from "./types";
import CVForm from "./components/CVForm";
import CVPreview from "./components/CVPreview";
import { signInWithGoogleSheets, appendCVToGoogleSheet, getCachedAuth, clearCachedAuth } from "./googleSheetsAuth";

// Initial professional resume details to fill the form so the user gets an instant premium view.
const DEFAULT_CV_DATA: CVData = {
  name: "Alexander Mercer",
  nickname: "Alex",
  email: "alexander.mercer@gmail.com",
  skillCategories: [
    {
      id: "skc_1",
      categoryName: "Core Expertise",
      skills: ["TypeScript", "React", "Node.js", "Tailwind CSS"],
      icon: "sparkles"
    },
    {
      id: "skc_2",
      categoryName: "Technical Tools",
      skills: ["UI/UX Design", "REST APIs", "System Architecture", "Git"],
      icon: "laptop"
    }
  ],
  capabilitiesTitle: "Capabilities",
  capabilitiesDescription: "My Skill Sets & Professional Tools",
  contactNo: "+1 (555) 381-5411",
  jobPosition: "Full Stack Engineer",
  currentPosition: "Senior Interactive Web Developer",
  photoUrl: "", // Start blank so user can practice PNG/JPG upload
  personalProfile: "Innovative and detail-oriented Full Stack Developer with 4+ years of experience constructing high-performance Web-Apps. Passionate about responsive UI components, sleek motion design, and developer ecosystems.",
  education: [
    {
      id: "edu_1",
      schoolName: "State Technical University",
      startYear: "2018",
      endYear: "2022",
      skillsDuties: "Bachelor of Science in Computer Science. Graduated with honors, specialized in software design paradigms, network security, and interface design frameworks."
    },
    {
      id: "edu_2",
      schoolName: "Creative Design Institute",
      startYear: "2022",
      endYear: "2023",
      skillsDuties: "Professional Certificate in User Interface & Modern Digital Aesthetics."
    }
  ],
  experience: [
    {
      id: "exp_1",
      jobTitle: "Lead Frontend Developer",
      startYearMonth: "2022/01",
      endYearMonth: "Present",
      jobDuties: "Spearheaded front-end design systems using custom utility classes to boost load speeds by 30%. Guided engineering sprints covering full-stack Express REST APIs.",
      project: "Performance Analytics Core System"
    },
    {
      id: "exp_2",
      jobTitle: "Software Engineer",
      startYearMonth: "2020/03",
      endYearMonth: "2021/12",
      jobDuties: "Iterated on scalable components and integrated interactive charts to display metrics elegantly for business-level users.",
      project: "Cloud Invoicing Modernizer Platform"
    }
  ],
  portfolio: [
    {
      id: "port_1",
      projectName: "Apex Kanban Workspace",
      description: "A collaborative Kanban workspace featuring live dragging, custom indicators, and sleek dark layouts for tech teams.",
      url: "https://example.com/apex-boards",
      coverPhoto: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80",
      categories: ["COMMERCIAL", "SYSTEMS"]
    },
    {
      id: "port_2",
      projectName: "Zenith Commerce Portal",
      description: "A full headless digital store showcasing grid layouts, smart search, and clean payment interfaces.",
      url: "https://example.com/zenith-commerce",
      coverPhoto: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
      categories: ["DOCUMENTARY", "E-COMMERCE"]
    }
  ],
  portfolioStyle: "independence"
};

export default function App() {
  const [cvData, setCvData] = useState<CVData>(DEFAULT_CV_DATA);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Share & Publishing State
  const [isPublishedViewer, setIsPublishedViewer] = useState<boolean>(false);
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Keep slug in sync with nickname or name unless user edited it manually
  const [customSlug, setCustomSlug] = useState<string>("alex");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false);
  const [hideBase64, setHideBase64] = useState<boolean>(true);

  const [publishError, setPublishError] = useState<string | null>(null);

  // Google Sheets integration state
  const [isSavingToSheet, setIsSavingToSheet] = useState<boolean>(false);
  const [sheetSaveStatus, setSheetSaveStatus] = useState<"idle" | "success" | "auth_needed" | "error">("idle");
  const [sheetSaveErrorMessage, setSheetSaveErrorMessage] = useState<string | null>(null);

  // Security portal homepage states
  const [showLandingPortal, setShowLandingPortal] = useState<boolean>(true);
  const [hasServerDefaultCV, setHasServerDefaultCV] = useState<boolean>(false);
  const [serverDefaultCVPayload, setServerDefaultCVPayload] = useState<any>(null);

  // Suffix/key credentials for accessing an existing CV from portal page
  const [loginSlug, setLoginSlug] = useState<string>("");
  const [loginKey, setLoginKey] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Helper handler: login to edit existing CV securely
  const handleLoginAndEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const response = await fetch(`/api/get-for-edit?slug=${encodeURIComponent(loginSlug)}`);
      
      let result: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON Login Response:", text.substring(0, 500));
        throw new Error(`伺服器返回了非 JSON 格式錯誤 (可能是 404 或 500 頁面)。狀態碼: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(result?.error || "管理金鑰或網址後綴不正確。");
      }
      
      if (result && result.success && result.data) {
        const { cvData: pCvData, primary, secondary, background, slug: loadedSlug } = result.data;
        if (pCvData) {
          setCvData(pCvData);
        }
        if (primary) setPrimaryColor(primary);
        if (secondary) setSecondaryColor(secondary);
        if (background) setBackgroundColor(background);
        
        const cleanSlug = (loadedSlug || loginSlug).toLowerCase().trim();
        setCustomSlug(cleanSlug || "alex");
        if (cleanSlug) {
          setIsSlugManuallyEdited(true);
        } else {
          setIsSlugManuallyEdited(false);
        }
        
        setShowLandingPortal(false);
        setIsPublishedViewer(false);
        setActiveTab("edit");
      }
    } catch (err: any) {
      console.error("Login verification failed:", err);
      setLoginError(err.message || "驗證失敗，請確認網址後綴與管理金鑰。");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Helper handler: start building a fresh resume from landing page
  const handleCreateNewCV = () => {
    const rand = Math.random().toString(36).substring(2, 10);
    
    // Generate unique slug by default to prevent overlapping/clashing with locked slugs (like alex)
    const shortSlug = `alex-${rand.substring(0, 5)}`;
    setCustomSlug(shortSlug);
    setIsSlugManuallyEdited(false);

    setCvData(DEFAULT_CV_DATA);
    setPrimaryColor("#ff5d34");
    setSecondaryColor("#ff8d3b");
    setBackgroundColor("#0f0d13");
    
    setShowLandingPortal(false);
    setIsPublishedViewer(false);
    setActiveTab("edit");
  };

  useEffect(() => {
    if (!isSlugManuallyEdited && cvData) {
      const currentCV = cvData || DEFAULT_CV_DATA;
      const candidateName = (currentCV.nickname || currentCV.name || "alex")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, "");    // trim leading/trailing hyphens
      setCustomSlug(candidateName || "alex");
    }
  }, [cvData.name, cvData.nickname, isSlugManuallyEdited]);

  // Check URL query parameters or hash for published CV
  useEffect(() => {
    const handleUrlParsing = async () => {
      let sharedData: string | null = null;
      let hashSlug: string | null = null;

      try {
        // Parse hash-route custom slug, e.g. #/p/alex-mercer
        if (window.location.hash) {
          const hash = window.location.hash;
          const matchSlug = hash.match(/^#\/p\/([^?#\/]+)/);
          if (matchSlug && matchSlug[1]) {
            hashSlug = matchSlug[1];
          }
        }

        // Direct search URL parameter check
        const params = new URLSearchParams(window.location.search);
        sharedData = params.get("shared");

        // Check within window.location.hash query parameter
        if (!sharedData && window.location.hash) {
          const hash = window.location.hash;
          const qIndex = hash.indexOf('?');
          if (qIndex !== -1) {
            const hashParams = new URLSearchParams(hash.substring(qIndex));
            sharedData = hashParams.get("shared");
          } else {
            const match = hash.match(/shared=([^&]+)/);
            if (match && match[1]) {
              sharedData = match[1];
            }
          }
        }
      } catch (err) {
        console.error("Failed to parse URL query parameters:", err);
      }

      // 1. Try to fetch custom slug from the backend server first
      if (hashSlug) {
        try {
          const response = await fetch(`/api/published?slug=${encodeURIComponent(hashSlug)}`);
          if (response.ok) {
            const result = await response.json();
            if (result.published && result.data) {
              const { cvData: pCvData, primary, secondary, background } = result.data;
              if (pCvData && pCvData.name && pCvData.name.trim() !== "") {
                setCvData(pCvData);
              } else {
                setCvData(DEFAULT_CV_DATA);
              }
              if (primary) setPrimaryColor(primary);
              if (secondary) setSecondaryColor(secondary);
              if (background) setBackgroundColor(background);
              setCustomSlug(hashSlug);
              setIsSlugManuallyEdited(true);
              setIsPublishedViewer(true);
              setShowLandingPortal(false); // Hide landing page if visiting a real slug website!
              return; // Loaded successfully via custom slug route
            }
          }
        } catch (err) {
          console.error(`Failed to fetch published CV with slug "${hashSlug}":`, err);
        }
      }

      // 2. Fallback to inline Base64 shared parameter if present
      if (sharedData) {
        try {
          let cleanData = sharedData;
          try {
            cleanData = decodeURIComponent(sharedData);
          } catch (e) {
            // Proceed with original string
          }
          
          const binary = atob(cleanData);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const decodedStr = new TextDecoder().decode(bytes);
          const payload = JSON.parse(decodedStr);
          
          if (payload && payload.cvData) {
            if (!payload.cvData.name || payload.cvData.name.trim() === "") {
              setCvData(DEFAULT_CV_DATA);
            } else {
              setCvData(payload.cvData);
            }

            if (payload.primary) setPrimaryColor(payload.primary);
            if (payload.secondary) setSecondaryColor(payload.secondary);
            if (payload.background) setBackgroundColor(payload.background);
            setIsPublishedViewer(true);
            setShowLandingPortal(false); // Hide landing page if visiting a shared link!
            return;
          } else {
            setCvData(DEFAULT_CV_DATA);
            setIsPublishedViewer(true);
            setShowLandingPortal(false);
            return;
          }
        } catch (err) {
          console.error("Failed to decode shared data from URL. Applying default candidate fallback:", err);
          setCvData(DEFAULT_CV_DATA);
          setIsPublishedViewer(true);
          setShowLandingPortal(false);
          return;
        }
      }

      // 3. Root URL access without query/hashed slug parameters
      // Check the server state for persistent default homepage cv data
      try {
        const response = await fetch("/api/published");
        if (response.ok) {
          const result = await response.json();
          if (result.published && result.data) {
            setHasServerDefaultCV(true);
            setServerDefaultCVPayload(result.data);
          } else {
            setHasServerDefaultCV(false);
            setServerDefaultCVPayload(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch fallback published CV from server:", err);
      }

      // Keep user on the Landing Portal instead of auto-viewing / auto-loading editor
      setIsPublishedViewer(false);
      setShowLandingPortal(true);
    };

    handleUrlParsing();

    // Listen to hashchange events so users can navigate or load another shared page without reload
    window.addEventListener("hashchange", handleUrlParsing);
    return () => {
      window.removeEventListener("hashchange", handleUrlParsing);
    };
  }, []);

  // Public-facing publish API handler
  const publishCV = async (currentCV = cvData, primary = primaryColor, secondary = secondaryColor, bg = backgroundColor, slugVal = customSlug) => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      const cleanSlugName = (slugVal || "alex")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Ensure we never publish empty data to backend persistent file
      const cvToPublish = (!currentCV || !currentCV.name || currentCV.name.trim() === "") ? DEFAULT_CV_DATA : currentCV;
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: cleanSlugName,
          cvData: cvToPublish,
          primary,
          secondary,
          background: bg
        })
      });
      
      let result: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON Publish Response:", text.substring(0, 500));
        throw new Error(`伺服器返回了非 JSON 格式錯誤 (這可能表示網址路由未匹配，或者您的預設伺服器重啟中)。狀態碼: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(result?.error || "儲存至伺服器時失敗。");
      }

      if (result && result.success === false) {
        throw new Error(result?.error || "儲存至伺服器時失敗。");
      }
      
      return true;
    } catch (err: any) {
      console.error("Failed to auto-publish CV to server:", err);
      setPublishError(err.message || "無法完成網址設定，請換個後綴或檢查您的管理金鑰。");
      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  const getShareUrl = () => {
    try {
      // Guarantee that the workspace content packed has filled content, otherwise package default template
      const currentCV = (!cvData || !cvData.name || cvData.name.trim() === "") ? DEFAULT_CV_DATA : cvData;

      // Compute the production/pre-release origin
      let origin = window.location.origin;
      if (origin.includes("-dev-")) {
        origin = origin.replace("-dev-", "-pre-");
      }

      // Generate a dynamic slug based on candidate name or nickname
      const slugName = (customSlug || "alex")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, "");    // trim leading/trailing hyphens

      if (hideBase64) {
        return `${origin}/#/p/${slugName}`;
      } else {
        const payloadObj = {
          cvData: currentCV,
          primary: primaryColor,
          secondary: secondaryColor,
          background: backgroundColor
        };
        
        const str = JSON.stringify(payloadObj);
        const utf8Bytes = new TextEncoder().encode(str);
        let binary = "";
        for (let i = 0; i < utf8Bytes.byteLength; i++) {
          binary += String.fromCharCode(utf8Bytes[i]);
        }
        const base64 = btoa(binary);

        return `${origin}/#/p/${slugName}?shared=${encodeURIComponent(base64)}`;
      }
    } catch (err) {
      console.error("Failed to build share url", err);
      // Fallback
      let origin = window.location.origin;
      if (origin.includes("-dev-")) {
        origin = origin.replace("-dev-", "-pre-");
      }
      return origin + "/";
    }
  };

  const copyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openLiveWebsite = async () => {
    // Attempt to publish before viewing
    const success = await publishCV();
    if (success) {
      const url = getShareUrl();
      window.open(url, "_blank");
    }
  };

  const handleSubmitAndViewLiveWebsite = async () => {
    setIsSavingToSheet(true);
    setSheetSaveStatus("idle");
    setSheetSaveErrorMessage(null);

    try {
      // 1. First, publish/synchronize the CV details to the server
      const successPublish = await publishCV(cvData, primaryColor, secondaryColor, backgroundColor, customSlug);
      if (!successPublish) {
        throw new Error("儲存履歷設定失敗（可能是管理金鑰或網址後綴已被鎖定）。");
      }

      // 2. Obtain Google authorization token to write to Google Sheets
      let userToken = "";
      const authInfo = getCachedAuth();
      if (authInfo.token) {
        userToken = authInfo.token;
      } else {
        setSheetSaveStatus("auth_needed");
        const signInRes = await signInWithGoogleSheets();
        if (!signInRes?.accessToken) {
          throw new Error("Google 授權登入失敗，無法取得存取試算表的金鑰。");
        }
        userToken = signInRes.accessToken;
      }

      // 3. Append to the spreadsheet
      const shareUrl = getShareUrl();
      const appendSuccess = await appendCVToGoogleSheet(userToken, cvData, shareUrl);

      if (appendSuccess) {
        setSheetSaveStatus("success");
        // Open the live site in a new window / tab
        const liveUrl = getShareUrl();
        window.open(liveUrl, "_blank");
      } else {
        throw new Error("資料未能順利寫入 Google 試算表。");
      }
    } catch (err: any) {
      console.error("Submit/View live website error:", err);
      
      // Specifically catch and troubleshoot 403 issue
      const isForbidden = err.message && (err.message.includes("403") || err.message.includes("permission") || err.message.includes("權限"));
      
      // Clear credentials cache on any failure so next authentication is absolutely fresh and prompts again
      try {
        await clearCachedAuth();
      } catch (cacheErr) {
        console.warn("Could not clear cached auth automatically:", cacheErr);
      }

      setSheetSaveStatus("error");
      if (isForbidden) {
        setSheetSaveErrorMessage(
          "⚠️ 403 權限拒絕錯誤：您的 Google 帳戶在授權登入時，可能「未勾選」『查看、編輯、建立和刪除您在 Google 雲端硬碟中的所有試算表』的必要編輯權限，或者該試算表不允許您的帳號編輯。請再次點選按鈕提交，在彈出的 Google 登入視窗中，請「務必勾選」允許存取 Google 試算表的核取方塊，並使用 ckchrisc9306@gmail.com 登入！"
        );
      } else {
        setSheetSaveErrorMessage(err.message || "同步試算表時遭遇問題。請重試。");
      }
    } finally {
      setIsSavingToSheet(false);
    }
  };

  // Dynamic state for manually inputted or Gemini recommended website color schemes
  const [primaryColor, setPrimaryColor] = useState<string>("#ff5d34");
  const [secondaryColor, setSecondaryColor] = useState<string>("#ff8d3b");
  const [backgroundColor, setBackgroundColor] = useState<string>("#0f0d13");

  // Recommendation status
  const [isRecommending, setIsRecommending] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<ColorPalette[]>([]);
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState<number | null>(null);

  // Clear Form Handler
  const handleClearAll = () => {
    const confirmClear = window.confirm("確定要清除所有欄位並建立一個全新的履歷嗎？");
    if (!confirmClear) return;

    const rand = Math.random().toString(36).substring(2, 10);

    setCvData({
      name: "",
      nickname: "",
      email: "",
      skillCategories: [],
      contactNo: "",
      jobPosition: "",
      currentPosition: "",
      photoUrl: "",
      personalProfile: "",
      education: [],
      experience: [],
      portfolio: [],
      portfolioStyle: "independence"
    });
    setRecommendations([]);
    setSelectedPaletteIndex(null);
    setPrimaryColor("#ff5d34");
    setSecondaryColor("#ff8d3b");
    setBackgroundColor("#0f0d13");
    
    // Generate unique slug by default to prevent overlapping/clashing with locked slugs (like alex)
    setCustomSlug(`alex-${rand.substring(0, 5)}`);
    setIsSlugManuallyEdited(false);
  };

  // Local color palettes generator as a failure/offline or static fallback
  const getLocalFallbackColors = (position: string) => {
    const posLower = (position || "").toLowerCase();
    if (posLower.includes("design") || posLower.includes("art") || posLower.includes("creative") || posLower.includes("writer") || posLower.includes("photo") || posLower.includes("fashion") || posLower.includes("ux") || posLower.includes("ui")) {
      return [
        {
          name: "Creative Amethyst (Preset)",
          primary: "#c084fc",
          secondary: "#be185d",
          background: "#090d16",
          explanation: "High-contrast dark space featuring neon amethyst and violet highlights tailored beautifully for creative fields."
        },
        {
          name: "Vibrant Studio Rose (Preset)",
          primary: "#be185d",
          secondary: "#6d28d9",
          background: "#fff1f2",
          explanation: "Vibrant and aesthetic rose and deep purple pairing over a soft light canvas, capturing creative versatility."
        },
        {
          name: "Soft Sage Harmony (Preset)",
          primary: "#15803d",
          secondary: "#0f766e",
          background: "#f0fdf4",
          explanation: "An organic, comforting green and teal palette signaling sustainable style and polished digital craftsmanship."
        }
      ];
    } else if (posLower.includes("tech") || posLower.includes("dev") || posLower.includes("eng") || posLower.includes("code") || posLower.includes("soft") || posLower.includes("program") || posLower.includes("data") || posLower.includes("cyber")) {
      return [
        {
          name: "Electric Cyber Space (Preset)",
          primary: "#06b6d4",
          secondary: "#0ea5e9",
          background: "#020617",
          explanation: "High-contrast electric cyan and sky blue on a premium dark void, reflecting cutting-edge technical code skills."
        },
        {
          name: "Sleek Indigo Slate (Preset)",
          primary: "#4f46e5",
          secondary: "#06b6d4",
          background: "#f8fafc",
          explanation: "Elegant slate, indigo and cyan tones over high-contrast light background, signaling technical architecture."
        },
        {
          name: "Matrix Emerald (Preset)",
          primary: "#10b981",
          secondary: "#059669",
          background: "#050505",
          explanation: "Vivid retro matrix green and rich emerald tones, perfectly matching backend and low-level system engineering."
        }
      ];
    } else {
      return [
        {
          name: "Classic Slate Premium (Preset)",
          primary: "#1e293b",
          secondary: "#475569",
          background: "#f8fafc",
          explanation: "Professional deep slate look giving an exceptionally polished and reliable feel for corporate or enterprise fields."
        },
        {
          name: "Royal Trust Accent (Preset)",
          primary: "#2563eb",
          secondary: "#4f46e5",
          background: "#f0f4ff",
          explanation: "Trustworthy, structured deep blue tones well-suited for business developer, executive, or management fields."
        },
        {
          name: "Emerald Creative Tech (Preset)",
          primary: "#059669",
          secondary: "#0d9488",
          background: "#f0fdf4",
          explanation: "Fresh and energetic green accent tones, ideal for front-end developers, product owners or creative specialists."
        }
      ];
    }
  };

  // Submit Handler: fetch tailored design palettes from backend Gemini AI
  const handleSubmitAndAnalyze = async () => {
    if (!cvData.name || !cvData.email || !cvData.jobPosition || !cvData.skillCategories || cvData.skillCategories.length === 0) {
      alert("Please fill in all mandatory fields: Name, Email, Job Position, and Skill Set.");
      return;
    }

    setIsRecommending(true);
    setSelectedPaletteIndex(null);

    let updatedPrimary = primaryColor;
    let updatedSecondary = secondaryColor;
    let updatedBackground = backgroundColor;

    try {
      const response = await fetch("/api/recommend-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: cvData.jobPosition })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.recommendations && result.recommendations.length > 0) {
          setRecommendations(result.recommendations);
          // Automatically prefilled/apply the primary, secondary and background colors from the first option
          const firstRec = result.recommendations[0];
          updatedPrimary = firstRec.primary;
          updatedSecondary = firstRec.secondary;
          updatedBackground = firstRec.background;
          
          setPrimaryColor(updatedPrimary);
          setSecondaryColor(updatedSecondary);
          setBackgroundColor(updatedBackground);
          setSelectedPaletteIndex(0);
        }
      } else {
        // Local fallback on static hosting environments like github pages
        const fallbackRecs = getLocalFallbackColors(cvData.jobPosition);
        setRecommendations(fallbackRecs);
        const firstRec = fallbackRecs[0];
        updatedPrimary = firstRec.primary;
        updatedSecondary = firstRec.secondary;
        updatedBackground = firstRec.background;
        
        setPrimaryColor(updatedPrimary);
        setSecondaryColor(updatedSecondary);
        setBackgroundColor(updatedBackground);
        setSelectedPaletteIndex(0);
      }

      // Automatically publish to backend to enable clean URL presentation
      const success1 = await publishCV(cvData, updatedPrimary, updatedSecondary, updatedBackground);
      
      // Auto-navigate directly to the Live Resume Site and deploy shareable link
      setActiveTab("preview");
      if (success1) setShowPublishModal(true);
    } catch (err) {
      console.warn("Utilizing tailored advisor recommendation presets (Local Fallback):", err);
      const fallbackRecs = getLocalFallbackColors(cvData.jobPosition);
      setRecommendations(fallbackRecs);
      const firstRec = fallbackRecs[0];
      updatedPrimary = firstRec.primary;
      updatedSecondary = firstRec.secondary;
      updatedBackground = firstRec.background;
      
      setPrimaryColor(updatedPrimary);
      setSecondaryColor(updatedSecondary);
      setBackgroundColor(updatedBackground);
      setSelectedPaletteIndex(0);

      // Auto-save standard state to backend as fallback
      let success2 = false;
      try {
        success2 = await publishCV(cvData, updatedPrimary, updatedSecondary, updatedBackground);
      } catch (pErr) {
        console.error("Failed to publish static fallback:", pErr);
      }
      
      // Still auto-navigate directly to the Live Resume Site and deploy shareable link
      setActiveTab("preview");
      if (success2) setShowPublishModal(true);
    } finally {
      setIsRecommending(false);
    }
  };

  // Recommend for position only: fetch palettes directly for the given designation
  const handleRecommendColorsOnly = async (position: string) => {
    if (!position || !position.trim()) {
      alert("Please enter a job position designation first!");
      return;
    }

    setIsRecommending(true);
    setSelectedPaletteIndex(null);

    try {
      const response = await fetch("/api/recommend-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: position.trim() })
      });

      if (!response.ok) {
        throw new Error("Failed to retrieve recommendations.");
      }

      const result = await response.json();
      if (result.recommendations && result.recommendations.length > 0) {
        setRecommendations(result.recommendations);
        // Automatically prefill/apply the primary, secondary and background colors from the first option
        const firstRec = result.recommendations[0];
        setPrimaryColor(firstRec.primary);
        setSecondaryColor(firstRec.secondary);
        setBackgroundColor(firstRec.background);
        setSelectedPaletteIndex(0);
      }
    } catch (err) {
      console.warn("Utilizing offline fallback design advisor recommendations:", err);
      const fallbackRecs = getLocalFallbackColors(position);
      setRecommendations(fallbackRecs);
      const firstRec = fallbackRecs[0];
      setPrimaryColor(firstRec.primary);
      setSecondaryColor(firstRec.secondary);
      setBackgroundColor(firstRec.background);
      setSelectedPaletteIndex(0);
    } finally {
      setIsRecommending(false);
    }
  };

  const selectPalette = (index: number, palette: ColorPalette) => {
    setSelectedPaletteIndex(index);
    setPrimaryColor(palette.primary);
    setSecondaryColor(palette.secondary);
    setBackgroundColor(palette.background);
  };

  if (isPublishedViewer) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans text-slate-200 transition-all relative">
        {/* Standalone Live Resume Website */}
        <CVPreview 
          data={cvData}
          primary={primaryColor}
          secondary={secondaryColor}
          background={backgroundColor}
        />
        
        {/* Floating action button to return to index/portal page */}
        <div className="fixed bottom-6 right-6 z-50 print:hidden animate-fade-in">
          <button
            onClick={() => {
              setShowLandingPortal(true);
              setIsPublishedViewer(false);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/95 hover:bg-slate-800 text-white font-semibold text-xs rounded-full shadow-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-95 select-none"
          >
            <Home className="w-3.5 h-3.5 text-indigo-400" />
            <span>回首頁 (Back to Home)</span>
          </button>
        </div>
      </div>
    );
  }

  if (showLandingPortal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col justify-between antialiased font-sans text-slate-200 relative overflow-hidden">
        {/* Ambient glow decoration backdrops */}
        <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[15%] w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Brand Header */}
        <header className="max-w-7xl w-full mx-auto px-6 py-6 border-b border-white/5 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-r from-blue-605 to-indigo-605 bg-blue-600 p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/20">
              <Code className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                CV Website <span className="text-blue-400">Builder</span>
              </span>
              <p className="text-[10px] text-slate-400 tracking-wide uppercase font-mono">Interactive Developer Portal</p>
            </div>
          </div>
          <div className="text-[10px] bg-white/5 border border-white/10 text-slate-400 px-3 py-1 rounded-full font-mono">
            v2.1 (Secure Access)
          </div>
        </header>

        {/* Dashboard Menu Grid */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col justify-center relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              個人網頁履歷發佈中心
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              極速建立個人專屬一頁式全螢幕作品集與履歷網站。系統整合安全鎖定保護設計，僅有知悉「安全管理金鑰」的網頁擁有者可進行編輯與更新。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">
            {/* Action 1: Create fresh new cv */}
            <div className="bg-white/[0.03] border border-white/10 hover:border-blue-500/30 p-6 rounded-2xl flex flex-col justify-between transition-all hover:bg-white/[0.05] group shadow-xl">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">🚀 製作全新履歷網站</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    從專業優雅範本開始，系統將為您產生一組隨機專屬的安全管理金鑰並儲存於瀏覽器，之後隨時能用於驗證更新。
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateNewCV}
                className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>建立全新網站</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Action 3: View current public homepage if exists */}
            <div className="bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 p-6 rounded-2xl flex flex-col justify-between transition-all hover:bg-white/[0.05] group shadow-xl">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">👀 瀏覽已發佈的主要網站</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    任何連線至主根目錄的訪客或面試官，均可以點擊此處立即跳轉進入最近一次公開發佈之官方默認網頁。
                  </p>
                </div>

                <div className="bg-black/30 border border-white/5 p-3.5 rounded-xl border-dashed">
                  {hasServerDefaultCV ? (
                    <div className="space-y-1 text-left">
                      <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        系統目前已發佈網頁
                      </p>
                      <div className="text-[10px] text-slate-400 leading-normal">
                        <p>名：<span className="text-slate-200">{(serverDefaultCVPayload?.cvData?.name) || "Alexander"}</span></p>
                        <p>職：<span className="text-slate-200">{(serverDefaultCVPayload?.cvData?.jobPosition) || "Full Stack Engineer"}</span></p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-left leading-normal">
                      目前伺服器硬碟尚未發佈任何官方預設履歷。您可以點選左側「製作全新履歷網站」來發佈第一份！
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  if (hasServerDefaultCV && serverDefaultCVPayload) {
                    const { cvData: pCvData, primary, secondary, background } = serverDefaultCVPayload;
                    if (pCvData) setCvData(pCvData);
                    if (primary) setPrimaryColor(primary);
                    if (secondary) setSecondaryColor(secondary);
                    if (background) setBackgroundColor(background);
                    setIsPublishedViewer(true);
                    setShowLandingPortal(false);
                  } else {
                    // Fallback to client default interactive demo preview
                    setIsPublishedViewer(true);
                    setShowLandingPortal(false);
                  }
                }}
                className="mt-6 w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-slate-200"
              >
                <span>立即瀏覽預設網頁</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        <footer className="w-full text-center py-6 shrink-0 border-t border-white/5 text-[10px] text-slate-500 relative z-10">
          <p>© 2026 Live CV Web Builder. By matching your security key, only you retain editing privileges.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] flex flex-col antialiased font-sans text-slate-200 overflow-x-hidden">
      {/* Top Banner Branding / Header Panel */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 py-4 px-6 shrink-0 print:hidden shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/80 backdrop-blur-xs text-white p-2.5 rounded-xl flex items-center justify-center border border-white/10">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5 animate-fadeIn">
                CV Website <span className="text-blue-400">Builder</span> <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-400/20 font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Gemini Pro</span>
              </h1>
              <p className="text-xs text-slate-400">Synthesize customized resume pages with recommended palettes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Return to Portal Button */}
            <button
              type="button"
              onClick={() => {
                setShowLandingPortal(true);
                setIsPublishedViewer(false);
              }}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>首頁 (Portal)</span>
            </button>

            {/* View Mode Selectors */}
            <div className="bg-black/30 p-1 rounded-xl flex items-center gap-1 border border-white/10 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "edit"
                    ? "bg-white/10 text-white border border-white/10 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Edit className="w-3.5 h-3.5 text-blue-400" /> Form Inputs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-white/10 text-white border border-white/10 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" /> Live Resume Site
              </button>
            </div>

            <button
              type="button"
              disabled={isPublishing}
              onClick={async () => {
                const success = await publishCV();
                if (success) {
                  setShowPublishModal(true);
                  setCopied(false);
                }
              }}
              className="px-4.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-emerald-500/10 active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <svg className="animate-spin h-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  Publish Webpage
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Layout (Single Page Switcher) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Forms & Palette Section -> Left Panel */}
        {activeTab === "edit" && (
          <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
            {/* Form Content */}
            <CVForm 
              data={cvData}
              onChange={setCvData}
              onSubmit={handleSubmitAndAnalyze}
              onClear={handleClearAll}
              isSubmitting={isRecommending}
              onRecommendColorsOnly={handleRecommendColorsOnly}
            />

            {/* Color Palettes Console */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg space-y-5 print:hidden text-slate-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 font-sans">
                  <Palette className="w-4 h-4 text-blue-400" /> Visual Identity
                </h3>
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Manual Palette Editor</span>
              </div>

              {/* Generated Color Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs text-blue-400 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> AI recommended 3 design templates for: &ldquo;{cvData.jobPosition}&rdquo;
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {recommendations.map((rec, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectPalette(index, rec)}
                        className={`p-3 rounded-xl border transition-all relative cursor-pointer text-left ${
                          selectedPaletteIndex === index 
                            ? "border-blue-400/80 bg-blue-500/10 shadow-lg text-white" 
                            : "border-white/10 bg-black/20 hover:bg-black/35 text-slate-300"
                        }`}
                      >
                        {selectedPaletteIndex === index && (
                          <span className="absolute top-2 right-2 p-0.5 bg-blue-500 rounded-full text-white border border-white/20">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        
                        <p className="text-xs font-bold text-white line-clamp-1">{rec.name}</p>
                        
                        {/* Swatches previews */}
                        <div className="flex gap-1.5 my-2.5">
                          <span className="w-5 h-5 rounded-md border border-white/15 block shrink-0" style={{ backgroundColor: rec.primary }} title="Primary Theme" />
                          <span className="w-5 h-5 rounded-md border border-white/15 block shrink-0" style={{ backgroundColor: rec.secondary }} title="Secondary Highlight" />
                          <span className="w-5 h-5 rounded-md border border-white/15 block shrink-0" style={{ backgroundColor: rec.background }} title="Background canvas" />
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3 leading-xs pt-1 border-t border-white/5 mt-1">
                          {rec.explanation}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.length === 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 text-slate-300">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-white">Interactive recommendations waiting</p>
                    <p className="opacity-80">Type your desired job designation (e.g. Senior UX Designer), configure your resume and hit &ldquo;Recommend Colors&rdquo;. The AI Advisor generates tailored palettes attuned to your specific domain details.</p>
                  </div>
                </div>
              )}

              {/* Manual Color Customizer Layout */}
              <div className="mt-auto space-y-4 bg-black/20 p-4 rounded-xl border border-white/10">
                <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60">Custom Palette Editor</h4>
                
                <div className="space-y-3">
                  {/* Primary Box */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-white/20 cursor-pointer shadow-md shrink-0 relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
                      <input 
                        type="color" 
                        value={primaryColor} 
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          setSelectedPaletteIndex(null);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={primaryColor} 
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setSelectedPaletteIndex(null);
                      }}
                      className="flex-1 bg-transparent border-b border-white/10 text-xs py-1 focus:outline-none focus:border-blue-450 text-white font-mono tracking-wider"
                    />
                    <span className="text-[9px] uppercase tracking-wider opacity-50 shrink-0 w-20 text-right">Primary</span>
                  </div>

                  {/* Secondary Box */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-white/20 cursor-pointer shadow-md shrink-0 relative overflow-hidden" style={{ backgroundColor: secondaryColor }}>
                      <input 
                        type="color" 
                        value={secondaryColor} 
                        onChange={(e) => {
                          setSecondaryColor(e.target.value);
                          setSelectedPaletteIndex(null);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={secondaryColor} 
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        setSelectedPaletteIndex(null);
                      }}
                      className="flex-1 bg-transparent border-b border-white/10 text-xs py-1 focus:outline-none focus:border-blue-450 text-white font-mono tracking-wider"
                    />
                    <span className="text-[9px] uppercase tracking-wider opacity-50 shrink-0 w-20 text-right">Secondary</span>
                  </div>

                  {/* Background Box */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-white/20 cursor-pointer shadow-md shrink-0 relative overflow-hidden" style={{ backgroundColor: backgroundColor }}>
                      <input 
                        type="color" 
                        value={backgroundColor} 
                        onChange={(e) => {
                          setBackgroundColor(e.target.value);
                          setSelectedPaletteIndex(null);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={backgroundColor} 
                      onChange={(e) => {
                        setBackgroundColor(e.target.value);
                        setSelectedPaletteIndex(null);
                      }}
                      className="flex-1 bg-transparent border-b border-white/10 text-xs py-1 focus:outline-none focus:border-blue-450 text-white font-mono tracking-wider"
                    />
                    <span className="text-[9px] uppercase tracking-wider opacity-50 shrink-0 w-20 text-right">Background</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Swapped Action Buttons placed below the Visual Identity panel */}
            <div className="flex items-center gap-4 pt-2 print:hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmitAndAnalyze();
                }}
                disabled={isRecommending}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700/50 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {isRecommending ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI Generating Website...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    Submit &amp; Generate Website
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold text-sm transition-all cursor-pointer hover:border-white/20 active:scale-[0.98]"
              >
                Clean All
              </button>
            </div>
          </div>
        )}

        {/* Real-time Web Preview Panel -> Right Panel */}
        {activeTab === "preview" && (
          <div className="w-full max-w-7xl mx-auto animate-fadeIn rounded-3xl border border-white/15 shadow-2xl bg-white/10 backdrop-blur-xl overflow-hidden">
            {/* Cover Panel header */}
            <div className="bg-black/30 border-b border-white/10 p-4 flex justify-between items-center px-6 print:hidden">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400 animate-pulse" /> Live Visual Website Canvas
              </span>
              <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">Interactive Web Sandbox</span>
            </div>

            <CVPreview 
              data={cvData}
              primary={primaryColor}
              secondary={secondaryColor}
              background={backgroundColor}
            />
          </div>
        )}
      </main>

      {/* Dynamic Publish Live Link Modal Overlay */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-fadeIn text-left">
            <button
              onClick={() => setShowPublishModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Share2 className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Your Personal CV Website is Deployed!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  We have built and launched a public link containing all your personalized resume details. Customize your URL suffix and choose if you want to hide the details from your link address!
                </p>
              </div>

              {/* URL Customizer Section */}
              <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-xl pt-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-blue-400">
                    1. Custom URL Suffix
                  </label>
                  <div className="flex items-center gap-1 bg-black/40 border border-white/10 px-3 py-2 rounded-lg">
                    <span className="text-xs text-slate-500 font-mono font-medium">/p/</span>
                    <input
                      type="text"
                      placeholder="e.g. alex-mercer"
                      value={customSlug}
                      onChange={(e) => {
                        const val = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""); // allow alphanumeric and hyphens
                        setCustomSlug(val);
                        setIsSlugManuallyEdited(true);
                        setCopied(false);
                      }}
                      className="flex-1 bg-transparent text-xs text-white font-mono focus:outline-none placeholder-slate-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Keep it short! Users can visit this clean path.
                  </p>
                </div>

                <div className="pt-2.5 border-t border-white/5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-blue-400">
                    2. Link Privacy Style
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideBase64}
                      onChange={(e) => {
                        setHideBase64(e.target.checked);
                        setCopied(false);
                      }}
                      className="mt-0.5 rounded border-white/10 bg-slate-950 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-left">
                      <p className="text-xs text-slate-200 font-semibold">Hide Base64 Data (Highly Recommended)</p>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Saves data cleanly to the server database. Keeps the URL short, private, and neat.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Inline error alerts */}
                {publishError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-lg text-left leading-normal flex items-start gap-2">
                    <span className="mt-0.5 text-red-400 font-bold font-mono">⚠️</span>
                    <div>
                      <p className="font-semibold text-red-300 text-xs">儲存失敗 / 網址已被鎖定</p>
                      <p className="text-[10px] text-red-300 mt-0.5 whitespace-pre-wrap">{publishError}</p>
                    </div>
                  </div>
                )}

                {/* Confirm Save / Sync Button to update backend mapping */}
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={async () => {
                    const success = await publishCV(cvData, primaryColor, secondaryColor, backgroundColor, customSlug);
                    if (success) {
                      // trigger copy automatically for great feedback
                      const url = getShareUrl();
                      navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="w-full mt-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  {isPublishing ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Saving to Server...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                      <span>Save Settings &amp; Copy URL</span>
                    </>
                  )}
                </button>
              </div>

              {/* URL Display Area */}
              <div className="bg-black/35 rounded-xl border border-white/5 p-3 flex items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl()}
                  className="flex-1 bg-transparent text-xs text-slate-300 font-mono focus:outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer select-none shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-blue-300" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Instant View Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={openLiveWebsite}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer select-none"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Live Website</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
