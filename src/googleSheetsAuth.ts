import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets scope
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.setCustomParameters({
  login_hint: "ckchrisc9306@gmail.com",
  prompt: "consent select_account"
});

// Access token cached in memory
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export const getCachedAuth = () => {
  return { user: cachedUser, token: cachedAccessToken };
};

export const clearCachedAuth = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedUser = null;
};

// Sign in with Google with correct scopes
export const signInWithGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("無法取得 Google 試算表存取金鑰 (AccessToken)。");
    }
    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Firebase Google Auth Error:", error);
    throw error;
  }
};

const SPREADSHEET_ID = "1eGKJRUrQK12UsDBVIWC_OX8sn_B-OA7cJ2Ki5pWyC30";

// Appends CV content into the user's public Google sheet using Google Sheets API
export const appendCVToGoogleSheet = async (
  accessToken: string,
  cvData: any,
  shareUrl: string
): Promise<boolean> => {
  try {
    // 1. Fetch spreadsheet info to find the first sheet's name dynamically to guarantee compatibility
    let targetSheetName = "Sheet1";
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );
      if (metaRes.ok) {
        const metadata = await metaRes.json();
        if (metadata.sheets && metadata.sheets.length > 0) {
          targetSheetName = metadata.sheets[0].properties.title;
          console.log("Found dynamic sheet name:", targetSheetName);
        }
      } else {
        console.warn("Could not fetch sheet title dynamic properties, using fallback Sheet1");
      }
    } catch (metaErr) {
      console.error("Error reading sheets metadata:", metaErr);
    }

    // 2. Prepare columns
    const timestamp = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    const educationStr = (cvData.education || [])
      .map((edu: any) => `${edu.schoolName || ""}(${edu.startYear || ""}-${edu.endYear || ""}): ${edu.skillsDuties || ""}`)
      .join(" | ");
    const experienceStr = (cvData.experience || [])
      .map((exp: any) => `${exp.project || "職責"} - ${exp.jobTitle || ""} (${exp.startYearMonth || ""} - ${exp.endYearMonth || ""}): ${exp.jobDuties || ""}`)
      .join(" | ");
    const portfolioStr = (cvData.portfolio || [])
      .map((port: any) => `${port.projectName || "作品"}(${(port.categories || []).join(",")}): ${port.description || ""} [${port.url || ""}]`)
      .join(" | ");
    const skillsStr = (cvData.skillCategories || [])
      .map((cat: any) => `${cat.categoryName || "Skills"}: ${(cat.skills || []).join(', ')}`)
      .join(" | ");

    const rowValues = [
      timestamp,                    // 提交時間
      cvData.name || "",            // 姓名
      cvData.nickname || "",        // 暱稱
      cvData.email || "",           // 電子郵件
      cvData.contactNo || "",       // 聯絡電話
      cvData.jobPosition || "",     // 求職意向
      cvData.currentPosition || "", // 目前職位/狀態
      cvData.personalProfile || "", // 個人簡介
      skillsStr,                    // 專業技能
      educationStr,                 // 學歷背景
      experienceStr,                // 工作專案
      portfolioStr,                 // 作品集
      shareUrl                      // 線上網址
    ];

    // 3. Append values via sheets append endpoint
    // We use USER_ENTERED to parse strings to formatting if applicable
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(targetSheetName)}!A:Z:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        range: `${targetSheetName}!A:Z`,
        majorDimension: "ROWS",
        values: [rowValues]
      })
    });

    if (!response.ok) {
      const respText = await response.text();
      console.error("Save to sheet failed response text:", respText);
      throw new Error(`Google Sheets 伺服器返回錯誤。狀態碼: ${response.status}`);
    }

    const resJson = await response.json();
    console.log("Successfully saved row to Google Sheets:", resJson);
    return true;
  } catch (error: any) {
    console.error("Failed to append CV to spreadsheet:", error);
    throw error;
  }
};
