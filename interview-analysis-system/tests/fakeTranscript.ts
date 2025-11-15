/**
 * Fake transcript simulator for Cultural Fit Detection testing
 * 
 * Contains realistic interview transcript entries with:
 * - Positive cultural signals (ownership, curiosity, accountability)
 * - Negative signals (blame-shifting, excuses, arrogance)
 * - Neutral filler content
 * - Contradictions and inconsistencies
 */

export interface TranscriptEntry {
  speaker: 'candidate' | 'recruiter';
  text: string;
}

/**
 * Simulated interview transcript with mixed signals
 * 
 * This transcript includes:
 * - Positive signals: ownership, accountability, curiosity, growth mindset
 * - Negative signals: blame-shifting, excuses, arrogance, contradictions
 * - Realistic interview flow with recruiter questions
 */
export const fakeTranscript: TranscriptEntry[] = [
  // Opening - Neutral/Positive
  {
    speaker: 'recruiter',
    text: 'Thank you for joining us today. Can you tell me a bit about yourself and your background?'
  },
  {
    speaker: 'candidate',
    text: 'Sure! I have about 5 years of experience in software engineering, working primarily with React and Node.js. I really enjoy solving complex problems and learning new technologies.'
  },
  
  // Positive signal: Ownership and accountability
  {
    speaker: 'recruiter',
    text: 'Can you tell me about a challenging project you worked on?'
  },
  {
    speaker: 'candidate',
    text: 'Absolutely. I led a project last year where we had a critical bug in production. I took full responsibility for it, even though it was a team effort. I stayed up all night to fix it and then implemented better testing to prevent it from happening again.'
  },
  
  // Positive signal: Curiosity and growth mindset
  {
    speaker: 'recruiter',
    text: 'How do you stay current with technology trends?'
  },
  {
    speaker: 'candidate',
    text: 'I\'m always curious about new frameworks and tools. I spend time reading tech blogs, contributing to open source, and I recently completed a course on machine learning just because I wanted to understand it better.'
  },
  
  // Negative signal: Blame-shifting
  {
    speaker: 'recruiter',
    text: 'Tell me about a time when a project didn\'t go as planned.'
  },
  {
    speaker: 'candidate',
    text: 'Well, there was this one project where we missed the deadline. But honestly, it wasn\'t my fault. The requirements kept changing, and my teammates didn\'t communicate properly. I did my part, but the rest of the team let me down.'
  },
  
  // Negative signal: Excuses and avoidance
  {
    speaker: 'recruiter',
    text: 'How do you handle feedback from code reviews?'
  },
  {
    speaker: 'candidate',
    text: 'I mean, code reviews are fine, but sometimes people are just being nitpicky. If they don\'t like my approach, that\'s their problem. I know what I\'m doing, and I\'ve been doing this for a while.'
  },
  
  // Contradiction: Years of experience
  {
    speaker: 'recruiter',
    text: 'You mentioned 5 years of experience earlier. Can you walk me through your career progression?'
  },
  {
    speaker: 'candidate',
    text: 'Actually, I had only 2 years of direct experience before this role. The other 3 years were more like internships and part-time work, so I\'m still relatively new to the industry.'
  },
  
  // Positive signal: Teamwork and humility
  {
    speaker: 'recruiter',
    text: 'How do you work with team members who have different skill levels?'
  },
  {
    speaker: 'candidate',
    text: 'I really value collaboration. I\'ve mentored junior developers and learned a lot from senior engineers. I think everyone brings something valuable to the table, and I\'m always open to feedback and different perspectives.'
  },
  
  // Negative signal: Arrogance
  {
    speaker: 'recruiter',
    text: 'What would you say is your biggest weakness?'
  },
  {
    speaker: 'candidate',
    text: 'Honestly, I don\'t really have weaknesses. I\'m good at everything I do. Some people might say I work too hard, but that\'s not really a weakness, is it? I just set high standards for myself and others.'
  },
  
  // Positive signal: Transparency and learning from mistakes
  {
    speaker: 'recruiter',
    text: 'Can you share an example of when you made a mistake and how you handled it?'
  },
  {
    speaker: 'candidate',
    text: 'Yes, I once pushed code that broke a feature for a few hours. I immediately acknowledged the mistake, rolled it back, and then spent time understanding what went wrong. I documented the issue and shared it with the team so we could all learn from it.'
  },
  
  // Negative signal: Vagueness and avoidance
  {
    speaker: 'recruiter',
    text: 'Why are you leaving your current position?'
  },
  {
    speaker: 'candidate',
    text: 'Oh, you know, just looking for new opportunities. Things are fine, but I want something different. I\'d rather not get into specifics about my current role.'
  },
  
  // Positive signal: Communication clarity
  {
    speaker: 'recruiter',
    text: 'How do you explain technical concepts to non-technical stakeholders?'
  },
  {
    speaker: 'candidate',
    text: 'I break down complex topics into simple analogies and focus on the business impact. I use visual aids when helpful and always check for understanding. Clear communication is really important to me.'
  },
  
  // Negative signal: Toxic attitude
  {
    speaker: 'recruiter',
    text: 'How do you handle disagreements with team members?'
  },
  {
    speaker: 'candidate',
    text: 'Well, if someone disagrees with me, they\'re usually wrong. I\'ve been doing this long enough to know what works. I don\'t have time for people who don\'t know what they\'re talking about.'
  }
];

/**
 * Get all candidate-only utterances from the transcript
 * 
 * @returns Array of candidate speech text
 */
export function getCandidateUtterances(): string[] {
  return fakeTranscript
    .filter(entry => entry.speaker === 'candidate')
    .map(entry => entry.text);
}

/**
 * Get the full transcript with speaker labels
 * 
 * @returns Complete transcript array
 */
export function getFullTranscript(): TranscriptEntry[] {
  return fakeTranscript;
}

