import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Request logging middleware to troubleshoot route resolution
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`[ROUTE LOG] ${req.method} ${req.url}`);
  next();
});

let memoryPublishedCV: any = null;
const PUBLISHED_FILE_PATH = path.join(process.cwd(), "published_cv.json");
const SLUGS_FILE_PATH = path.join(process.cwd(), "published_slugs.json");
let memorySlugCVs: Record<string, any> = {};

// Load initially from file if exists
try {
  if (fs.existsSync(PUBLISHED_FILE_PATH)) {
    const fileContent = fs.readFileSync(PUBLISHED_FILE_PATH, "utf8");
    memoryPublishedCV = JSON.parse(fileContent);
    console.log("Loaded existing published CV from disk.");
  }
} catch (err) {
  console.warn("No initial published CV found or failed to load:", err);
}

try {
  if (fs.existsSync(SLUGS_FILE_PATH)) {
    const fileContent = fs.readFileSync(SLUGS_FILE_PATH, "utf8");
    memorySlugCVs = JSON.parse(fileContent);
    console.log("Loaded existing published custom slugs map from disk.");
  }
} catch (err) {
  console.warn("No initial slug mapper file found or failed to load:", err);
}

// API endpoint to publish the resume data persistently
app.post("/api/publish", (req: express.Request, res: express.Response) => {
  try {
    const payload = req.body;
    const slug = payload.slug;

    if (slug) {
      const cleanSlug = String(slug).toLowerCase().trim();
      
      // Persist custom slug ONLY
      memorySlugCVs[cleanSlug] = payload;
      fs.writeFileSync(SLUGS_FILE_PATH, JSON.stringify(memorySlugCVs, null, 2), "utf8");
      
      return res.json({ success: true, message: "Custom CV published successfully!" });
    }

    // Persist default CV
    memoryPublishedCV = payload;
    fs.writeFileSync(PUBLISHED_FILE_PATH, JSON.stringify(payload, null, 2), "utf8");

    return res.json({ success: true, message: "CV published successfully!" });
  } catch (err: any) {
    console.error("Failed to write published CV to disk:", err);
    return res.json({ success: true, message: "CV published in memory.", warning: err.message });
  }
});

// API endpoint to retrieve the currently published resume
app.get("/api/published", (req: express.Request, res: express.Response) => {
  const { slug } = req.query;
  if (slug) {
    const cleanSlug = String(slug).toLowerCase().trim();
    if (memorySlugCVs[cleanSlug]) {
      // Redact the security authorKey so other public clients cannot inspect it
      const cvWithNoKey = { ...memorySlugCVs[cleanSlug] };
      delete cvWithNoKey.authorKey;
      return res.json({ published: true, data: cvWithNoKey });
    }
    return res.json({ published: false, error: "Not found for requested slug." });
  }
  if (memoryPublishedCV) {
    // Redact for home layout as well
    const cvWithNoKey = { ...memoryPublishedCV };
    delete cvWithNoKey.authorKey;
    return res.json({ published: true, data: cvWithNoKey });
  }
  return res.json({ published: false });
});

// Secure API endpoint to retrieve cv for editing, but only if the correct authorKey is supplied
app.get("/api/get-for-edit", (req: express.Request, res: express.Response) => {
  const { slug, authorKey } = req.query;
  const reqKey = authorKey ? String(authorKey).trim() : "";

  if (slug) {
    const cleanSlug = String(slug).toLowerCase().trim();
    const stored = memorySlugCVs[cleanSlug];
    if (!stored) {
      return res.status(200).json({ success: false, error: "找不到此網址後綴的網站。" });
    }
    const storedKey = stored.authorKey ? String(stored.authorKey).trim() : "";
    if (storedKey && storedKey !== reqKey) {
      return res.status(200).json({ success: false, error: "安全管理金鑰不正確，您無權修改此網站。" });
    }
    return res.json({ success: true, data: stored });
  } else {
    // Default home layout
    if (!memoryPublishedCV) {
      return res.status(200).json({ success: false, error: "尚未發佈預設主頁網站。" });
    }
    const storedKey = memoryPublishedCV.authorKey ? String(memoryPublishedCV.authorKey).trim() : "";
    if (storedKey && storedKey !== reqKey) {
      return res.status(200).json({ success: false, error: "安全管理金鑰不正確，您無權修改預設主頁。" });
    }
    return res.json({ success: true, data: memoryPublishedCV });
  }
});

// Initialize the Gemini Client securely
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// API endpoint to recommend color configurations matching the requested job position
app.post("/api/recommend-colors", async (req: express.Request, res: express.Response) => {
  try {
    const { position } = req.body;
    if (!position) {
      return res.status(400).json({ error: "Position parameter is required." });
    }

    if (!ai) {
      console.warn("GEMINI_API_KEY is not configured on the server. Utilizing rich fallback recommendations.");
      return res.json({
        recommendations: [
          {
            name: "Classic Slate Premium",
            primary: "#1e293b",
            secondary: "#475569",
            background: "#f8fafc",
            explanation: "Professional deep slate look giving an exceptionally polished and reliable feel for engineering, architecture and corporate fields."
          },
          {
            name: "Emerald Creative Tech",
            primary: "#059669",
            secondary: "#0d9488",
            background: "#f0fdf4",
            explanation: "Fresh, vibrant, and energetic, ideal for front-end developers, product designers, and creative technological specialists."
          },
          {
            name: "Royal Trust Accent",
            primary: "#2563eb",
            secondary: "#4f46e5",
            background: "#f0f4ff",
            explanation: "Trustworthy, structured blue tones well-suited for project managers, business developers, and legal or finance professionals."
          }
        ]
      });
    }

    const prompt = `Provide 3 beautiful, highly distinct color palettes tailored for a CV/portfolio website of a candidate who is seeking or working as a "${position}".
Each palette MUST represent a unique style and satisfy these strict contrast/pairing rules:
1. 'name': A unique visual title (e.g. "Steel Minimal", "Forest Harmony", "Classic Royal")
2. 'primary' and 'secondary': Must represent premium, elegant hex codes that are relatively similar and highly harmonious with each other (analogous or nearby hues), so they blend together beautifully (e.g., deep blue and navy, or emerald green and teal, or warm orange and vermilion, or purple and violet).
3. 'background': Must have extreme light-to-dark contrast against BOTH the primary and secondary colors. For instance, if the background is dark (e.g., "#090d16", "#0f172a"), the primary and secondary colors must be highly vibrant/vivid/bright (e.g., "#38bdf8" and "#60a5fa") so they pop beautifully. If the background is light/pale (e.g., "#fcfcf9", "#f8fafc", "#fdfefe"), the primary and secondary colors must be extremely deep/rich/dark (e.g., "#111827", "#1e3a8a") to guarantee perfect readability and accessibility.
4. 'explanation': A short 1-2 sentence description explaining why this visual identity matches a "${position}".

Ensure they are valid hex codes starting with a hash #.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["recommendations"],
          properties: {
            recommendations: {
              type: Type.ARRAY,
              description: "Array of exactly 3 different recommended palettes",
              items: {
                type: Type.OBJECT,
                required: ["name", "primary", "secondary", "background", "explanation"],
                properties: {
                  name: { type: Type.STRING },
                  primary: { type: Type.STRING },
                  secondary: { type: Type.STRING },
                  background: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    try {
      const data = JSON.parse(response.text || "{}");
      return res.json(data);
    } catch (parseError) {
      console.error("Failed to parse JSON response from Gemini, text was:", response.text);
      throw parseError;
    }
  } catch (err: any) {
    console.warn("Gemini API request rate-limited or failed. Applying tailored premium color presets for position:", err.message || err);
    
    // Check role keywords for premium tailored fallback palettes
    const posLower = (req.body.position || "").toLowerCase();
    let tailoredPalettes = [];
    
    if (posLower.includes("design") || posLower.includes("art") || posLower.includes("creative") || posLower.includes("writer") || posLower.includes("photo") || posLower.includes("fashion") || posLower.includes("ux") || posLower.includes("ui")) {
      tailoredPalettes = [
        {
          name: "Creative Slate Premium (Preset)",
          primary: "#be185d",
          secondary: "#6d28d9",
          background: "#fff1f2",
          explanation: "Vibrant and aesthetic rose and violet pairing over a soft rose canvas, capturing deep creative versatility."
        },
        {
          name: "Midnight Neon Studio (Preset)",
          primary: "#38bdf8",
          secondary: "#c084fc",
          background: "#090d16",
          explanation: "Artistic high-contrast dark space featuring neon sky-blue and amethyst highlights that spotlight creative projects."
        },
        {
          name: "Soft Sage Harmony (Preset)",
          primary: "#15803d",
          secondary: "#0f766e",
          background: "#f0fdf4",
          explanation: "An organic, comforting green with teal accents signaling sustainable style and polished craftsmanship."
        }
      ];
    } else if (posLower.includes("manage") || posLower.includes("lead") || posLower.includes("director") || posLower.includes("finance") || posLower.includes("consult") || posLower.includes("legal") || posLower.includes("sale") || posLower.includes("business") || posLower.includes("exec")) {
      tailoredPalettes = [
        {
          name: "Royal Executive Elite (Preset)",
          primary: "#1e3a8a",
          secondary: "#1d4ed8",
          background: "#f8fafc",
          explanation: "Commanding deep royal blue on a pristine slate background, establishing deep reliability and executive poise."
        },
        {
          name: "Crimson metrics (Preset)",
          primary: "#991b1b",
          secondary: "#ea580c",
          background: "#fffafb",
          explanation: "Sophisticated deep wine accents with high-energy copper highlights, representing focus and data-driven execution."
        },
        {
          name: "Forest Integrity (Preset)",
          primary: "#064e3b",
          secondary: "#047857",
          background: "#f4fbf7",
          explanation: "Polished dark jade tones symbolizing resourceful leadership, growth, and organizational competence."
        }
      ];
    } else {
      // Tech, Software Engineering, Developers, Data Scientists, and general roles
      tailoredPalettes = [
        {
          name: "Classic Midnight Tech (Preset)",
          primary: "#38bdf8",
          secondary: "#818cf8",
          background: "#090d16",
          explanation: "Electric cyan and deep indigo highlights over a sleek midnight cosmic canvas, tailored for modern engineering workflows."
        },
        {
          name: "Steel Blue Premium (Preset)",
          primary: "#1e293b",
          secondary: "#475569",
          background: "#f8fafc",
          explanation: "A polished charcoal slate aesthetic emphasizing technical precision, absolute accessibility and high readability."
        },
        {
          name: "Cyber Emerald Harmony (Preset)",
          primary: "#10b981",
          secondary: "#059669",
          background: "#060a0f",
          explanation: "Immersive virtual terminal highlights on deep dark basalt, ideal for developers desiring an eye-catching geek-chic posture."
        }
      ];
    }
    
    // Return the fallback palettes successfully with code 200, so the client receives them seamlessly
    return res.json({ recommendations: tailoredPalettes, isFallback: true });
  }
});

// Secure API endpoint to parse raw CV text or uploaded files using Gemini AI
// API endpoint to generate personal profile using Gemini
app.post("/api/generate-profile", async (req: express.Request, res: express.Response) => {
  try {
    const { experience, jobPosition } = req.body;
    
    // Parse experience block to a string representation to reduce context size
    const expStr = Array.isArray(experience) 
      ? experience.map((exp: any) => `${exp.startYearMonth} - ${exp.endYearMonth} | ${exp.jobTitle} | ${exp.jobDuties}`).join("\n")
      : "";

    const prompt = `You are a professional technical recruiter and executive resume writer. 
Write a highly compelling, professional "Personal Profile" summary (around 3 to 4 sentences). 
Target Job Position: ${jobPosition || "Professional"}
Work Experience Summary:
${expStr}

Provide ONLY the summary text, written in a clear, impactful way. Do not include introductory conversational text.`;

    if (!ai) {
      return res.status(503).json({ error: "Gemini AI client not initialized (missing API Key)." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    const generatedProfile = response.text?.trim() || "";
    return res.json({ profile: generatedProfile });
  } catch (err: any) {
    console.error("Failed to generate profile with Gemini:", err);
    return res.status(500).json({ error: "Failed to generate profile." });
  }
});

app.post("/api/parse-cv", async (req: express.Request, res: express.Response) => {
  try {
    const { textContent, fileBase64, mimeType } = req.body;
    
    if (!ai) {
      return res.status(400).json({ error: "Gemini AI key is not configured on the server." });
    }

    let contents: any = `Parse the target CV/resume text into the required structured form data schema.
If there are missing fields, extrapolate reasonably or fill in professional-quality dummy placeholders matching standard business CV contents.
Raw input text to parse:
${textContent || ""}`;

    // If an image (JPEG, PNG) or document (PDF, Word) is sent
    if (fileBase64 && mimeType) {
      const isSupportedFile = mimeType.startsWith("image/") || 
                               ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(mimeType);
      
      if (isSupportedFile) {
        contents = {
          parts: [
            {
              inlineData: {
                data: fileBase64,
                mimeType: mimeType
              }
            },
            {
              text: `Analyze this file (image, PDF, or Word document) of a resume. Parse all of its contact details, education history, work achievements, and portfolio items, mapping them to the expected JSON schema. Add professional details or resolve incomplete text contextually to yield a perfect resume structure.`
            }
          ]
        };
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["name", "email", "skills", "jobPosition", "education", "experience", "portfolio"],
          properties: {
            name: { type: Type.STRING },
            nickname: { type: Type.STRING },
            email: { type: Type.STRING },
            skills: { type: Type.STRING, description: "Comma-separated list of technical/soft skills" },
            contactNo: { type: Type.STRING },
            jobPosition: { type: Type.STRING },
            currentPosition: { type: Type.STRING },
            photoUrl: { type: Type.STRING },
            personalProfile: { type: Type.STRING },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "schoolName", "startYear", "endYear", "skillsDuties"],
                properties: {
                  id: { type: Type.STRING },
                  schoolName: { type: Type.STRING },
                  startYear: { type: Type.STRING },
                  endYear: { type: Type.STRING },
                  skillsDuties: { type: Type.STRING }
                }
              }
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "jobDuties", "project"],
                properties: {
                  id: { type: Type.STRING },
                  jobDuties: { type: Type.STRING },
                  project: { type: Type.STRING }
                }
              }
            },
            portfolio: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "projectName", "description", "url", "coverPhoto", "categories"],
                properties: {
                  id: { type: Type.STRING },
                  projectName: { type: Type.STRING },
                  description: { type: Type.STRING },
                  url: { type: Type.STRING },
                  coverPhoto: { type: Type.STRING },
                  categories: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                }
              }
            },
            portfolioStyle: { type: Type.STRING }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err: any) {
    console.error("Error parsing CV with Gemini:", err);
    return res.status(500).json({ error: err.message || "Failed to parse CV with Gemini AI." });
  }
});

// Secure API endpoint to generate complete styled CV data using a layout template or guide file
app.post("/api/generate-cv-from-template", async (req: express.Request, res: express.Response) => {
  try {
    const { templateText, userDetails, fileBase64, mimeType } = req.body;

    if (!ai) {
      return res.status(400).json({ error: "Gemini AI key is not configured on the server." });
    }

    let contents: any = `Generate a fully functional, high-quality professional CV matching the design requirements, sections list, layout style, guidelines, and reference structure specified in the Template below.
Use the provided personal details about the candidate if available, otherwise intelligently invent highly matching professional experiences, universities, and technical projects to synthesize a complete and stunning portfolio website dataset!

Reference Template text/guideline/example structure:
${templateText || ""}

User specific details/interests to incorporate (if any):
${userDetails || ""}`;

    if (fileBase64 && mimeType) {
      const isSupportedFile = mimeType.startsWith("image/") || 
                               ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(mimeType);
      
      if (isSupportedFile) {
        contents = {
          parts: [
            {
              inlineData: {
                data: fileBase64,
                mimeType: mimeType
              }
            },
            {
              text: `Generate a stunning CV dataset that conforms meticulously to the visual sections, content guidelines and style tone depicted in this uploaded CV template file (image, PDF, or Word document). If candidate's specifications are sparse, expand them appropriately and professionally.
User details if any: ${userDetails || ""}`
            }
          ]
        };
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["name", "email", "skills", "jobPosition", "education", "experience", "portfolio"],
          properties: {
            name: { type: Type.STRING },
            nickname: { type: Type.STRING },
            email: { type: Type.STRING },
            skills: { type: Type.STRING },
            contactNo: { type: Type.STRING },
            jobPosition: { type: Type.STRING },
            currentPosition: { type: Type.STRING },
            photoUrl: { type: Type.STRING },
            personalProfile: { type: Type.STRING },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "schoolName", "startYear", "endYear", "skillsDuties"],
                properties: {
                  id: { type: Type.STRING },
                  schoolName: { type: Type.STRING },
                  startYear: { type: Type.STRING },
                  endYear: { type: Type.STRING },
                  skillsDuties: { type: Type.STRING }
                }
              }
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "jobDuties", "project"],
                properties: {
                  id: { type: Type.STRING },
                  jobDuties: { type: Type.STRING },
                  project: { type: Type.STRING }
                }
              }
            },
            portfolio: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "projectName", "description", "url", "coverPhoto", "categories"],
                properties: {
                  id: { type: Type.STRING },
                  projectName: { type: Type.STRING },
                  description: { type: Type.STRING },
                  url: { type: Type.STRING },
                  coverPhoto: { type: Type.STRING },
                  categories: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                }
              }
            },
            portfolioStyle: { type: Type.STRING }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err: any) {
    console.error("Error generating CV from template with Gemini:", err);
    return res.status(500).json({ error: err.message || "Failed to generate CV from template." });
  }
});

// Configure Vite integration or serve production bundle
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
  
  return serverInstance;
}

const serverPromise = startServer().catch(err => {
  console.error("Failed to start server:", err);
});

export default serverPromise;
