/**
 * Fake transcript generator for contradiction detection testing
 * 
 * Generates realistic interview transcript entries with:
 * - Some contradictions (years, responsibilities)
 * - Some neutral lines
 * - Some curiosity
 * - Some blame
 * - Some bragging
 */

export interface TranscriptEntry {
  speaker: 'candidate' | 'recruiter';
  text: string;
}

/**
 * Generate fake transcript entries with contradictions
 */
export function generateFakeTranscript(): TranscriptEntry[] {
  return [
    {
      speaker: 'recruiter',
      text: "Tell me about your background and experience."
    },
    {
      speaker: 'candidate',
      text: "Sure! I have about 5 years of experience in software engineering, working primarily with React and Node.js. I really enjoy solving complex problems and learning new technologies."
    },
    {
      speaker: 'recruiter',
      text: "That's great. Can you tell me about a challenging project you've worked on?"
    },
    {
      speaker: 'candidate',
      text: "Absolutely. I led a project last year where we had a critical bug in production. I took full responsibility for it, even though it was a team effort. I stayed up all night to fix it and then implemented better testing to prevent it from happening again."
    },
    {
      speaker: 'recruiter',
      text: "What technologies are you most comfortable with?"
    },
    {
      speaker: 'candidate',
      text: "I'm always curious about new frameworks and tools. I spend time reading tech blogs, contributing to open source, and I recently completed a course on machine learning just because I wanted to understand it better."
    },
    {
      speaker: 'recruiter',
      text: "Can you tell me about a time when a project didn't go as planned?"
    },
    {
      speaker: 'candidate',
      text: "Well, there was this one project where we missed the deadline. But honestly, it wasn't my fault. The requirements kept changing, and my teammates didn't communicate properly. I did my part, but the rest of the team let me down."
    },
    {
      speaker: 'recruiter',
      text: "How do you handle code reviews?"
    },
    {
      speaker: 'candidate',
      text: "I mean, code reviews are fine, but sometimes people are just being nitpicky. If they don't like my approach, that's their problem. I know what I'm doing, and I've been doing this for a while."
    },
    {
      speaker: 'recruiter',
      text: "You mentioned 5 years of experience earlier. Can you break that down for me?"
    },
    {
      speaker: 'candidate',
      text: "Actually, I had only 2 years of direct experience before this role. The other 3 years were more like internships and part-time work, so I'm still relatively new to the industry."
    },
    {
      speaker: 'recruiter',
      text: "I see. Can you tell me about your leadership experience?"
    },
    {
      speaker: 'candidate',
      text: "I really value collaboration. I've mentored junior developers and learned a lot from senior engineers. I think everyone brings something valuable to the table, and I'm always open to feedback and different perspectives."
    },
    {
      speaker: 'recruiter',
      text: "What are your weaknesses?"
    },
    {
      speaker: 'candidate',
      text: "Honestly, I don't really have weaknesses. I'm good at everything I do. Some people might say I work too hard, but that's not really a weakness, is it? I just set high standards for myself and others."
    },
    {
      speaker: 'recruiter',
      text: "Can you tell me about a mistake you made and how you handled it?"
    },
    {
      speaker: 'candidate',
      text: "Yes, I once pushed code that broke a feature for a few hours. I immediately acknowledged the mistake, rolled it back, and then spent time understanding what went wrong. I documented the issue and shared it with the team so we could all learn from it."
    },
    {
      speaker: 'recruiter',
      text: "Why are you looking to leave your current role?"
    },
    {
      speaker: 'candidate',
      text: "Oh, you know, just looking for new opportunities. Things are fine, but I want something different. I'd rather not get into specifics about my current role."
    },
    {
      speaker: 'recruiter',
      text: "How do you communicate complex technical concepts?"
    },
    {
      speaker: 'candidate',
      text: "I break down complex topics into simple analogies and focus on the business impact. I use visual aids when helpful and always check for understanding. Clear communication is really important to me."
    },
    {
      speaker: 'recruiter',
      text: "How do you handle disagreements with team members?"
    },
    {
      speaker: 'candidate',
      text: "Well, if someone disagrees with me, they're usually wrong. I've been doing this long enough to know what works. I don't have time for people who don't know what they're talking about."
    },
    {
      speaker: 'recruiter',
      text: "Earlier you said you had 5 years of experience, but then mentioned only 2 years of direct experience. Can you clarify?"
    },
    {
      speaker: 'candidate',
      text: "Oh, I meant 5 years total including internships. But if we're talking about full-time professional experience, it's 2 years. I should have been clearer about that from the start."
    }
  ];
}

