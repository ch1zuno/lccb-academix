import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

let genAI = null;
if (config.geminiApiKey) {
  try {
    genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });
  } catch (err) {
    console.warn('[AI Assistant] Failed to initialize GoogleGenAI client:', err.message);
  }
}

/**
 * Generate a Socratic peer-tutoring hint based on session context and chat transcript.
 */
export async function generateTutoringHint({ session, transcript = [], studentQuery = '' }) {
  const subjectName = session.subject_name || session.subject || 'General Study';
  const topic = session.topic || 'General Review';

  const recentLines = transcript
    .slice(-8)
    .map(m => `${m.sender_name} (${m.sender_role}): ${m.content}`)
    .join('\n');

  const systemInstruction = `You are "Antigravity AI", an encouraging, pedagogically sound AI peer-tutoring assistant for La Consolacion College Bacolod (LCCB).
The current session is for: ${subjectName} — Topic: "${topic}".
RULES:
1. Provide a helpful conceptual hint, scaffolding question, or step-by-step reasoning cue.
2. NEVER give away the direct answer or write full finished code/solutions. Guide the learner to think and solve it.
3. Keep the tone warm, concise (2-4 sentences max), and easy to read.
4. If appropriate, offer a small analogy or ask a guiding question to test their understanding.`;

  const prompt = `Recent classroom conversation:\n${recentLines || '(Session just started)'}\n\nStudent request: "${studentQuery || 'Can you give me a hint on this topic?'}"\n\nYour hint:`;

  if (genAI) {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemInstruction}\n\n${prompt}`,
      });
      const text = response.text?.trim();
      if (text) return text;
    } catch (err) {
      console.warn('[AI Assistant] Gemini hint generation fallback:', err.message);
    }
  }

  // Intelligent contextual fallback (works offline or without GEMINI_API_KEY)
  const topicLower = topic.toLowerCase();
  if (topicLower.includes('list') || topicLower.includes('pointer') || topicLower.includes('node')) {
    return `Hint for ${topic}: Remember that each node contains both its data payload and a reference pointing to the next node. Before updating a pointer, make sure you don't lose the reference to the rest of the chain! What node does your pointer currently see?`;
  }
  if (topicLower.includes('recur') || topicLower.includes('base case')) {
    return `Hint for ${topic}: Every recursive algorithm requires two components: a base case that stops execution, and a smaller sub-problem step. What is the smallest possible input where your function already knows the answer without any extra work?`;
  }
  if (topicLower.includes('tree') || topicLower.includes('graph')) {
    return `Hint for ${topic}: Visualize the hierarchy starting from the root. If you traverse the branches, consider whether depth-first (following one path to its leaf) or breadth-first (exploring level-by-level) gives you the order you need.`;
  }
  return `Hint for ${topic}: Break the problem down into its simplest piece first. Review what inputs you have and what specific output is required. What is the first logical step you need to take before tackling the rest?`;
}

/**
 * Generate an end-of-session lesson summary and a custom 3-question review quiz
 * based on the completed session's chat transcript.
 */
export async function generateWrapUpSynthesis({ session, transcript = [] }) {
  const subjectName = session.subject_name || session.subject || 'General Study';
  const topic = session.topic || 'General Review';

  const transcriptText = transcript
    .map(m => `${m.sender_name} (${m.sender_role}): ${m.content}`)
    .join('\n');

  const prompt = `Analyze this tutoring transcript for LCCB Academix:
Subject: ${subjectName}
Topic: ${topic}
Transcript:
${transcriptText || 'The tutor and learner reviewed core concepts, solved practice examples, and clarified doubts.'}

Generate:
1. "summary": A concise 2-3 paragraph markdown summary of key concepts covered, student achievements, and topics to review next.
2. "quiz": An array of 3 multiple-choice questions testing the concepts discussed. Each item must have:
   - "question": string
   - "options": array of 4 string choices
   - "answer": integer index (0-3) of the correct choice
   - "explanation": brief explanation of why the answer is correct

Return ONLY a valid JSON object with keys "summary" (string) and "quiz" (array). Do not wrap in markdown backticks or commentary.`;

  if (genAI) {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text);
      if (parsed && typeof parsed.summary === 'string' && Array.isArray(parsed.quiz)) {
        return parsed;
      }
    } catch (err) {
      console.warn('[AI Assistant] Gemini synthesis fallback:', err.message);
    }
  }

  // Resilient fallback synthesis
  return {
    summary: `### Session Summary: ${subjectName} — ${topic}

During this session, the student and tutor engaged with core principles of **${topic}**. The session reinforced foundational definitions, walked through structured examples, and resolved key areas of hesitation.

**Key Achievements:**
- Actively discussed and clarified key steps in ${topic}.
- Verified understanding through real-time dialogue and problem review.
- Prepared for upcoming course assessments with actionable takeaways.

**Recommended Next Step:**
Review the session notes and practice implementing a similar exercise independently before the next class meeting.`,
    quiz: [
      {
        question: `In the context of ${topic}, what is the primary consideration when initiating a solution?`,
        options: [
          'Skipping validation to save execution steps',
          'Clarifying inputs, constraints, and the base condition first',
          'Assuming all test inputs will be uniform',
          'Hardcoding expected results directly',
        ],
        answer: 1,
        explanation: 'Effective problem solving requires establishing constraints, valid inputs, and base conditions before implementing the logic.',
      },
      {
        question: `Which approach best reinforces long-term retention of ${topic}?`,
        options: [
          'Relying solely on memory without writing practice problems',
          'Explaining the underlying logic step-by-step and testing edge cases',
          'Only reviewing the topic right before the final exam',
          'Memorizing code snippets without understanding data flow',
        ],
        answer: 1,
        explanation: 'Active explanation and testing edge cases solidifies conceptual grounding and diagnostic skills.',
      },
      {
        question: `When diagnosing an issue related to ${topic}, what should you verify first?`,
        options: [
          'State transitions and variable assignments across the execution path',
          'Recompiling the entire operating system',
          'Changing random lines until it works',
          'Disabling all runtime warning logs',
        ],
        answer: 0,
        explanation: 'Tracing state transitions reveals exactly where logic diverged from expectation.',
      },
    ],
  };
}

