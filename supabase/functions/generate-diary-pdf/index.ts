import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mood labels for professional document
const moodLabels: Record<string, { ru: string; en: string }> = {
  joy: { ru: "Радость", en: "Joy" },
  calm: { ru: "Спокойствие", en: "Calm" },
  anxiety: { ru: "Тревога", en: "Anxiety" },
  sadness: { ru: "Грусть", en: "Sadness" },
  anger: { ru: "Злость", en: "Anger" },
  fear: { ru: "Страх", en: "Fear" },
  love: { ru: "Любовь", en: "Love" },
  surprise: { ru: "Удивление", en: "Surprise" },
  disgust: { ru: "Отвращение", en: "Disgust" },
  neutral: { ru: "Нейтрально", en: "Neutral" },
  happy: { ru: "Счастье", en: "Happy" },
  sad: { ru: "Грусть", en: "Sad" },
  angry: { ru: "Злость", en: "Angry" },
  scared: { ru: "Страх", en: "Scared" },
  tired: { ru: "Усталость", en: "Tired" },
  excited: { ru: "Воодушевление", en: "Excited" },
  stressed: { ru: "Стресс", en: "Stressed" },
  peaceful: { ru: "Умиротворение", en: "Peaceful" },
  confused: { ru: "Растерянность", en: "Confused" },
  hopeful: { ru: "Надежда", en: "Hopeful" },
  fatigue: { ru: "Усталость", en: "Fatigue" },
};

type ExportType = "diary" | "smer";

function formatDate(date: string, lang: string): string {
  const d = new Date(date);
  if (lang === "ru") {
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(date: Date, lang: string): string {
  if (lang === "ru") {
    return date.toLocaleString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Generate Diary PDF content
function generateDiaryPdfContent(data: {
  lang: string;
  periodStart: string;
  periodEnd: string;
  uniqueDays: number;
  totalEntries: number;
  currentStreak: number;
  sortedMoods: [string, number][];
  moodEntries: any[];
  generatedAt: Date;
}): Uint8Array {
  const {
    lang,
    periodStart,
    periodEnd,
    uniqueDays,
    totalEntries,
    currentStreak,
    sortedMoods,
    moodEntries,
    generatedAt,
  } = data;

  const lines: string[] = [];
  
  // Header
  lines.push("================================================================");
  lines.push("");
  lines.push(lang === "ru" ? "                    БЕЗМЯТЕЖНЫЕ" : "                      SERENE");
  lines.push(lang === "ru" ? "                  Дневник настроения" : "                    Mood Diary");
  lines.push("");
  lines.push("================================================================");
  lines.push("");
  
  // Period info
  lines.push(lang === "ru" 
    ? `Период: ${periodStart} - ${periodEnd}`
    : `Period: ${periodStart} - ${periodEnd}`);
  lines.push(lang === "ru"
    ? `Дней: ${uniqueDays} | Записей: ${totalEntries}`
    : `Days: ${uniqueDays} | Entries: ${totalEntries}`);
  lines.push("");
  
  // Statistics
  lines.push("----------------------------------------------------------------");
  lines.push(lang === "ru" ? "СТАТИСТИКА" : "STATISTICS");
  lines.push("----------------------------------------------------------------");
  lines.push("");
  lines.push(lang === "ru" ? `  Всего записей:      ${totalEntries}` : `  Total entries:      ${totalEntries}`);
  lines.push(lang === "ru" ? `  Уникальных дней:    ${uniqueDays}` : `  Unique days:        ${uniqueDays}`);
  lines.push(lang === "ru" ? `  Текущая серия:      ${currentStreak} дней` : `  Current streak:     ${currentStreak} days`);
  
  if (sortedMoods.length > 0) {
    const topMood = sortedMoods[0][0];
    const topMoodLabel = moodLabels[topMood]?.[lang as "ru" | "en"] || topMood;
    lines.push(lang === "ru" 
      ? `  Частое настроение:  ${topMoodLabel}`
      : `  Most common mood:   ${topMoodLabel}`);
  }
  lines.push("");
  
  // Mood distribution
  if (sortedMoods.length > 0) {
    lines.push("----------------------------------------------------------------");
    lines.push(lang === "ru" ? "РАСПРЕДЕЛЕНИЕ НАСТРОЕНИЙ" : "MOOD DISTRIBUTION");
    lines.push("----------------------------------------------------------------");
    lines.push("");
    
    const maxCount = sortedMoods[0][1];
    
    for (const [mood, count] of sortedMoods.slice(0, 8)) {
      const label = moodLabels[mood]?.[lang as "ru" | "en"] || mood;
      const percentage = Math.round((count / totalEntries) * 100);
      const barLength = Math.round((count / maxCount) * 20);
      const bar = "#".repeat(barLength) + "-".repeat(20 - barLength);
      lines.push(`  ${label.padEnd(15)} [${bar}] ${percentage}%`);
    }
    lines.push("");
  }
  
  // Diary entries
  lines.push("----------------------------------------------------------------");
  lines.push(lang === "ru" ? "ЗАПИСИ ДНЕВНИКА" : "DIARY ENTRIES");
  lines.push("----------------------------------------------------------------");
  lines.push("");
  
  const entriesToShow = moodEntries.slice(0, 50);
  
  for (const entry of entriesToShow) {
    const moodLabel = moodLabels[entry.mood]?.[lang as "ru" | "en"] || entry.mood || "-";
    const dateStr = formatDate(entry.entry_date, lang);
    
    lines.push(`  ${dateStr} - ${moodLabel}`);
    
    if (entry.note) {
      const words = entry.note.split(" ");
      let currentLine = "    ";
      for (const word of words) {
        if (currentLine.length + word.length + 1 > 60) {
          lines.push(currentLine);
          currentLine = "    " + word;
        } else {
          currentLine += (currentLine === "    " ? "" : " ") + word;
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
    }
    lines.push("");
  }
  
  if (moodEntries.length > 50) {
    lines.push(lang === "ru"
      ? `  ... i esche ${moodEntries.length - 50} zapisey`
      : `  ... and ${moodEntries.length - 50} more entries`);
    lines.push("");
  }
  
  // Footer
  lines.push("================================================================");
  lines.push("");
  lines.push(lang === "ru"
    ? `Sgenerirovano: ${formatDateTime(generatedAt, lang)}`
    : `Generated: ${formatDateTime(generatedAt, lang)}`);
  lines.push("bezm.app");
  lines.push("");
  lines.push(lang === "ru"
    ? "Dokument prednaznachen dlya predostavleniya specialistu"
    : "Document intended for healthcare provider");
  lines.push("");
  lines.push("================================================================");
  
  const textContent = lines.join("\n");
  return createSimplePdf(textContent);
}

// Generate SMER PDF content
function generateSmerPdfContent(data: {
  lang: string;
  periodStart: string;
  periodEnd: string;
  totalEntries: number;
  smerEntries: any[];
  generatedAt: Date;
}): Uint8Array {
  const {
    lang,
    periodStart,
    periodEnd,
    totalEntries,
    smerEntries,
    generatedAt,
  } = data;

  const lines: string[] = [];
  
  // Header
  lines.push("================================================================");
  lines.push("");
  lines.push(lang === "ru" ? "                    БЕЗМЯТЕЖНЫЕ" : "                      SERENE");
  lines.push(lang === "ru" ? "        СМЭР: Ситуация-Мысли-Эмоции-Реакция" : "      SMER: Situation-Mind-Emotions-Reaction");
  lines.push("");
  lines.push("================================================================");
  lines.push("");
  
  // Period info
  lines.push(lang === "ru" 
    ? `Период: ${periodStart} - ${periodEnd}`
    : `Period: ${periodStart} - ${periodEnd}`);
  lines.push(lang === "ru"
    ? `Записей: ${totalEntries}`
    : `Entries: ${totalEntries}`);
  lines.push("");
  
  // SMER entries
  lines.push("----------------------------------------------------------------");
  lines.push(lang === "ru" ? "ЗАПИСИ СМЭР" : "SMER ENTRIES");
  lines.push("----------------------------------------------------------------");
  lines.push("");
  
  const entriesToShow = smerEntries.slice(0, 30);
  
  for (const entry of entriesToShow) {
    const dateStr = formatDate(entry.entry_date, lang);
    lines.push(`  [${dateStr}]`);
    lines.push("");
    
    // Situation
    if (entry.situation) {
      lines.push(lang === "ru" ? "  СИТУАЦИЯ:" : "  SITUATION:");
      const words = entry.situation.split(" ");
      let currentLine = "    ";
      for (const word of words) {
        if (currentLine.length + word.length + 1 > 58) {
          lines.push(currentLine);
          currentLine = "    " + word;
        } else {
          currentLine += (currentLine === "    " ? "" : " ") + word;
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      lines.push("");
    }
    
    // Thoughts
    if (entry.thoughts) {
      lines.push(lang === "ru" ? "  МЫСЛИ:" : "  THOUGHTS:");
      const words = entry.thoughts.split(" ");
      let currentLine = "    ";
      for (const word of words) {
        if (currentLine.length + word.length + 1 > 58) {
          lines.push(currentLine);
          currentLine = "    " + word;
        } else {
          currentLine += (currentLine === "    " ? "" : " ") + word;
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      lines.push("");
    }
    
    // Emotions
    if (entry.emotions && entry.emotions.length > 0) {
      lines.push(lang === "ru" ? "  ЭМОЦИИ:" : "  EMOTIONS:");
      const emotionsList = Array.isArray(entry.emotions) 
        ? entry.emotions.join(", ")
        : String(entry.emotions);
      lines.push(`    ${emotionsList}`);
      lines.push("");
    }
    
    // Reactions
    if (entry.reactions) {
      lines.push(lang === "ru" ? "  РЕАКЦИЯ:" : "  REACTION:");
      const words = entry.reactions.split(" ");
      let currentLine = "    ";
      for (const word of words) {
        if (currentLine.length + word.length + 1 > 58) {
          lines.push(currentLine);
          currentLine = "    " + word;
        } else {
          currentLine += (currentLine === "    " ? "" : " ") + word;
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      lines.push("");
    }
    
    lines.push("  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -");
    lines.push("");
  }
  
  if (smerEntries.length > 30) {
    lines.push(lang === "ru"
      ? `  ... i esche ${smerEntries.length - 30} zapisey`
      : `  ... and ${smerEntries.length - 30} more entries`);
    lines.push("");
  }
  
  // Footer
  lines.push("================================================================");
  lines.push("");
  lines.push(lang === "ru"
    ? `Sgenerirovano: ${formatDateTime(generatedAt, lang)}`
    : `Generated: ${formatDateTime(generatedAt, lang)}`);
  lines.push("bezm.app");
  lines.push("");
  lines.push(lang === "ru"
    ? "Dokument prednaznachen dlya predostavleniya specialistu"
    : "Document intended for healthcare provider");
  lines.push("");
  lines.push("================================================================");
  
  const textContent = lines.join("\n");
  return createSimplePdf(textContent);
}

function createSimplePdf(text: string): Uint8Array {
  const encoder = new TextEncoder();
  
  const objects: string[] = [];
  
  const lines = text.split("\n");
  const lineHeight = 12;
  const pageHeight = 842;
  const pageWidth = 595;
  const margin = 50;
  const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);
  
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage));
  }
  
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  
  const pageRefs = pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>\nendobj\n`);
  
  const fontObjNum = 3 + pages.length * 2;
  
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageObjNum = 3 + pageIndex * 2;
    const contentObjNum = pageObjNum + 1;
    
    objects.push(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj\n`);
    
    const pageLines = pages[pageIndex];
    let contentStream = "BT\n/F1 9 Tf\n";
    
    let y = pageHeight - margin;
    for (const line of pageLines) {
      const escapedLine = line
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/[^\x00-\x7F]/g, (char) => {
          const code = char.charCodeAt(0);
          if (code < 256) {
            return `\\${code.toString(8).padStart(3, "0")}`;
          }
          return "?";
        });
      
      contentStream += `1 0 0 1 ${margin} ${y} Tm\n(${escapedLine}) Tj\n`;
      y -= lineHeight;
    }
    
    contentStream += "ET";
    
    objects.push(`${contentObjNum} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  }
  
  objects.push(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n`);
  
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  
  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  
  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF";
  
  return encoder.encode(pdf);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[generate-diary-pdf] Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const lang = body.lang || "ru";
    const exportType: ExportType = body.type === "smer" ? "smer" : "diary";

    console.log(`[generate-diary-pdf] Generating ${exportType} PDF for user: ${userId}`);

    // Use service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check premium status
    const { data: profile } = await supabase
      .from("profiles")
      .select("premium_until, plan, display_name, username")
      .eq("user_id", userId)
      .single();

    let isPremium =
      profile?.plan === "premium" ||
      (profile?.premium_until && new Date(profile.premium_until) > new Date());

    if (!isPremium) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, plan, current_period_end")
        .eq("user_id", userId)
        .eq("status", "active")
        .eq("plan", "premium")
        .maybeSingle();

      isPremium = !!subscription && 
        (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());
    }

    // Premium check only for diary export, SMER is free for all
    if (!isPremium && exportType === "diary") {
      return new Response(JSON.stringify({ error: "Premium required for diary export" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const now = new Date();

    let pdfBytes: Uint8Array;
    let entriesCount = 0;
    let filePath: string;
    let updateColumn: string;
    let updateUrlColumn: string;

    if (exportType === "diary") {
      // Fetch mood entries
      const { data: moodEntries, error: moodError } = await supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("entry_date", ninetyDaysAgo.toISOString().split("T")[0])
        .order("entry_date", { ascending: false });

      if (moodError) {
        console.error("[generate-diary-pdf] Error fetching mood entries:", moodError);
        throw new Error("Failed to fetch mood entries");
      }

      if (!moodEntries || moodEntries.length === 0) {
        return new Response(JSON.stringify({ error: "No entries to export" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      entriesCount = moodEntries.length;
      const uniqueDays = new Set(moodEntries.map((e) => e.entry_date)).size;
      
      // Mood distribution
      const moodCounts: Record<string, number> = {};
      moodEntries.forEach((entry) => {
        if (entry.mood) {
          moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        }
      });
      const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]) as [string, number][];

      // Calculate streak
      let currentStreak = 0;
      const sortedDates = [...new Set(moodEntries.map((e) => e.entry_date))].sort().reverse();
      for (let i = 0; i < sortedDates.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expected = expectedDate.toISOString().split("T")[0];
        
        if (sortedDates[i] === expected) {
          currentStreak++;
        } else if (i === 0 && sortedDates[i] === new Date(Date.now() - 86400000).toISOString().split("T")[0]) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Get date range
      const dates = moodEntries.map((e) => new Date(e.entry_date));
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      pdfBytes = generateDiaryPdfContent({
        lang,
        periodStart: formatDate(minDate.toISOString(), lang),
        periodEnd: formatDate(maxDate.toISOString(), lang),
        uniqueDays,
        totalEntries: entriesCount,
        currentStreak,
        sortedMoods,
        moodEntries,
        generatedAt: now,
      });

      filePath = `${userId}/diary-latest.pdf`;
      updateColumn = "last_diary_pdf_export_at";
      updateUrlColumn = "last_diary_pdf_export_url";

    } else {
      // Fetch SMER entries
      const { data: smerEntries, error: smerError } = await supabase
        .from("smer_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("entry_date", ninetyDaysAgo.toISOString().split("T")[0])
        .order("entry_date", { ascending: false });

      if (smerError) {
        console.error("[generate-diary-pdf] Error fetching SMER entries:", smerError);
        throw new Error("Failed to fetch SMER entries");
      }

      if (!smerEntries || smerEntries.length === 0) {
        return new Response(JSON.stringify({ error: "No SMER entries to export" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      entriesCount = smerEntries.length;

      // Get date range
      const dates = smerEntries.map((e) => new Date(e.entry_date));
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      pdfBytes = generateSmerPdfContent({
        lang,
        periodStart: formatDate(minDate.toISOString(), lang),
        periodEnd: formatDate(maxDate.toISOString(), lang),
        totalEntries: entriesCount,
        smerEntries,
        generatedAt: now,
      });

      filePath = `${userId}/smer-latest.pdf`;
      updateColumn = "last_smer_pdf_export_at";
      updateUrlColumn = "last_smer_pdf_export_url";
    }

    console.log(`[generate-diary-pdf] PDF generated, size: ${pdfBytes.length} bytes`);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("diary-exports")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-diary-pdf] Upload error:", uploadError);
      throw new Error("Failed to upload PDF");
    }

    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("diary-exports")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      console.error("[generate-diary-pdf] Signed URL error:", signedUrlError);
      throw new Error("Failed to create download URL");
    }

    // Update profile metadata
    await supabase
      .from("profiles")
      .update({
        [updateColumn]: now.toISOString(),
        [updateUrlColumn]: filePath,
      })
      .eq("user_id", userId);

    console.log(`[generate-diary-pdf] Success for user ${userId}, type: ${exportType}`);

    return new Response(
      JSON.stringify({
        success: true,
        type: exportType,
        downloadUrl: signedUrlData.signedUrl,
        exportedAt: now.toISOString(),
        entriesCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[generate-diary-pdf] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
