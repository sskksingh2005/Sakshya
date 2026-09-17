import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ClassifyRequest {
  description: string;
  category?: string | null;
}

interface ClassifyResult {
  category: string;
  severity_score: number;
  summary: string;
  people_involved: string[];
  risk_keywords_detected: string[];
  fallback_used: boolean;
}

const VALID_CATEGORIES = [
  "verbal_abuse",
  "threat",
  "physical_abuse",
  "economic_abuse",
  "stalking_control",
];

const HIGH_RISK_KEYWORDS = [
  "weapon",
  "knife",
  "gun",
  "strangl",
  "choke",
  "threat to children",
  "children",
  "confin",
  "lock",
  "trap",
  "kill",
  "murder",
  "suicide",
  "burn",
  "acid",
];

const PHYSICAL_KEYWORDS = ["hit", "slap", "punch", "kick", "push", "shove", "beat", "hurt", "grab", "pull", "throw", "bite", "scratch", "choke", "strangl"];
const THREAT_KEYWORDS = ["threat", "warn", "leave or", "i'll", "i will", "you'll", "consequence", "regret", "harm you", "hurt you", "kill", "destroy"];
const VERBAL_KEYWORDS = ["yell", "shout", "scream", "insult", "abuse", "stupid", "useless", "worthless", "ugly", "fat", "curse", "swear", "humiliat", "shame", "disgrace"];
const ECONOMIC_KEYWORDS = ["money", "salary", "bank", "account", "dowry", "gold", "jewelry", "property", "income", "expense", "control", "restrict", "deny", "refuse", "withhold"];
const STALKING_KEYWORDS = ["follow", "track", "monitor", "check phone", "check messages", "where were you", "who were you", "location", "gps", "spy", "surveil", "control movement", "not allowed to go", "not allowed to meet"];

function fallbackClassify(description: string, category?: string | null): ClassifyResult {
  const lower = description.toLowerCase();

  // Detect risk keywords
  const riskKeywordsDetected = HIGH_RISK_KEYWORDS.filter((kw) =>
    lower.includes(kw)
  );

  // Detect people involved (simple heuristic: look for names or relationship terms)
  const peoplePatterns = [
    /\b(husband|wife|spouse|partner|mother-in-law|father-in-law|sister-in-law|brother-in-law|mother|father|sister|brother|son|daughter|boyfriend|girlfriend)\b/gi,
  ];
  const peopleSet = new Set<string>();
  for (const pattern of peoplePatterns) {
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach((m) => peopleSet.add(m.toLowerCase()));
    }
  }

  // Determine category
  let detectedCategory = category;
  if (!detectedCategory || !VALID_CATEGORIES.includes(detectedCategory)) {
    if (PHYSICAL_KEYWORDS.some((kw) => lower.includes(kw))) {
      detectedCategory = "physical_abuse";
    } else if (THREAT_KEYWORDS.some((kw) => lower.includes(kw))) {
      detectedCategory = "threat";
    } else if (ECONOMIC_KEYWORDS.some((kw) => lower.includes(kw))) {
      detectedCategory = "economic_abuse";
    } else if (STALKING_KEYWORDS.some((kw) => lower.includes(kw))) {
      detectedCategory = "stalking_control";
    } else {
      detectedCategory = "verbal_abuse";
    }
  }

  // Determine severity
  let severity = 1;
  if (riskKeywordsDetected.length > 0 || PHYSICAL_KEYWORDS.some((kw) => lower.includes(kw))) {
    if (
      riskKeywordsDetected.some((kw) =>
        ["weapon", "knife", "gun", "strangl", "choke", "kill", "murder", "burn", "acid"].includes(kw)
      )
    ) {
      severity = 4;
    } else {
      severity = 3;
    }
  } else if (THREAT_KEYWORDS.some((kw) => lower.includes(kw))) {
    severity = 2;
  } else {
    severity = 1;
  }

  // Generate a neutral summary (first 200 chars of original text)
  const summary =
    description.length > 200
      ? description.substring(0, 200) + "..."
      : description;

  return {
    category: detectedCategory,
    severity_score: severity,
    summary,
    people_involved: Array.from(peopleSet),
    risk_keywords_detected: riskKeywordsDetected,
    fallback_used: true,
  };
}

async function callOpenAI(description: string, category?: string | null): Promise<ClassifyResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const systemPrompt = `You are an incident-structuring assistant, not a lawyer. Classify the severity of this incident description using this rubric: 1 = verbal/emotional, 2 = threat, 3 = physical abuse, 4 = physical abuse involving a weapon, strangulation, or confinement. Do not invent facts not present in the text. Preserve the survivor's original wording in the summary field rather than paraphrasing dramatically. Do not make legal conclusions. Do not predict future violence. Return ONLY valid JSON in this exact shape: {"category": "verbal_abuse|threat|physical_abuse|economic_abuse|stalking_control", "severity_score": 1-4, "summary": "short neutral summary", "people_involved": ["..."], "risk_keywords_detected": ["..."]}`;

  const userContent = category
    ? `Pre-selected category hint: ${category}\n\nIncident description: ${description}`
    : `Incident description: ${description}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Parse and validate JSON
  let parsed: any;
  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Invalid JSON from OpenAI");
  }

  // Validate schema
  if (!VALID_CATEGORIES.includes(parsed.category)) {
    throw new Error("Invalid category from OpenAI");
  }
  if (typeof parsed.severity_score !== "number" || parsed.severity_score < 1 || parsed.severity_score > 4) {
    throw new Error("Invalid severity score from OpenAI");
  }
  if (typeof parsed.summary !== "string") {
    throw new Error("Invalid summary from OpenAI");
  }
  if (!Array.isArray(parsed.people_involved)) {
    parsed.people_involved = [];
  }
  if (!Array.isArray(parsed.risk_keywords_detected)) {
    parsed.risk_keywords_detected = [];
  }

  return {
    category: parsed.category,
    severity_score: parsed.severity_score,
    summary: parsed.summary,
    people_involved: parsed.people_involved,
    risk_keywords_detected: parsed.risk_keywords_detected,
    fallback_used: false,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { description, category } = (await req.json()) as ClassifyRequest;

    if (!description || description.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: ClassifyResult;
    try {
      result = await callOpenAI(description, category);
    } catch (err) {
      console.log("OpenAI call failed, using fallback:", err.message);
      result = fallbackClassify(description, category);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
