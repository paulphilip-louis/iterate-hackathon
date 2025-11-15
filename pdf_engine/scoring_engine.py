"""
Scoring engine for interview transcripts
Implements the 7-criteria scoring rubric with 0/2/4 marking system
Uses OpenAI LLM for candidate assessment
"""
from typing import Dict, Any, List
import json
import os
import logging
from openai import OpenAI
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize OpenAI client
def get_openai_client() -> OpenAI:
    """
    Initialize and return OpenAI client
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY not found. Please set it as an environment variable or in a .env file."
        )
    return OpenAI(api_key=api_key)

# Scoring Rubric Definition
SCORING_RUBRIC = [
    {
        "criterion": "Analytical thinking and problem solving",
        "poor": "Struggles to break down problems and identify root causes. Requires significant guidance.",
        "basic": "Can identify straightforward problems and apply basic logic to resolve them with some assistance.",
        "advanced": "Thinks critically and creatively to solve complex problems. Anticipates potential challenges and mitigates risks effectively.",
        "mark_poor": 0,
        "mark_basic": 2,
        "mark_advanced": 4,
        "max_score": 4
    },
    {
        "criterion": "Mastering analytical toolset (Python, ...)",
        "poor": "Familiar with some of the basic tools (pandas, simple dashboard on metabase), but struggles to use them effectively.",
        "basic": "Has basic familiarity with analytics tools but struggles to use them effectively without support.",
        "advanced": "Extensive knowledge of toolsets; integrates multiple tools seamlessly to create robust workflows and solve complex problems.",
        "mark_poor": 0,
        "mark_basic": 2,
        "mark_advanced": 4,
        "max_score": 4
    },
    {
        "criterion": "Communication with stakeholders",
        "poor": "Struggles to articulate findings and lacks clarity in communication.",
        "basic": "Can convey straightforward findings in a clear manner but may miss nuances or tailored messaging.",
        "advanced": "Excels in storytelling through data, crafting narratives that resonate with diverse audiences. Anticipates stakeholder needs proactively.",
        "mark_poor": 0,
        "mark_basic": 2,
        "mark_advanced": 4,
        "max_score": 4
    },
    {
        "criterion": "Ambition / High standards",
        "poor": "Accepts average or adequate results; rarely pushes beyond minimum requirements or seeks opportunities for improvement.",
        "basic": "Expects personal performance and team performance to be nothing short of the best.",
        "advanced": "Continuously sets aggressive, pioneering goals for self and team. Drives excellence and inspires others to achieve world-class outcomes.",
        "mark_poor": 0,
        "mark_basic": 1,
        "mark_advanced": 2,
        "max_score": 2
    },
    {
        "criterion": "Curiosity",
        "poor": "Focuses strictly on assigned tasks; rarely asks probing questions or seeks external information for context.",
        "basic": "Asks different questions across different subjects to have more context / learn.",
        "advanced": "Exhibits intellectual hunger, actively connects disparate ideas, and investigates underlying 'why's' to drive innovative solutions.",
        "mark_poor": 0,
        "mark_basic": 1,
        "mark_advanced": 2,
        "max_score": 2
    },
    {
        "criterion": "Honesty / Integrity",
        "poor": "May occasionally bend the truth or withhold crucial information when facing pressure or mistakes.",
        "basic": "Earns trust and maintains confidence. Does what is right, not just what is politically expedient. Speaks plainly and truthfully.",
        "advanced": "Serves as a moral compass for the team; consistently models transparent and ethical behavior, even when it involves significant personal or professional cost.",
        "mark_poor": 0,
        "mark_basic": 1,
        "mark_advanced": 2,
        "max_score": 2
    },
    {
        "criterion": "Work ethic",
        "poor": "Completes tasks only within set working hours; exhibits resistance to going the extra mile, often missing deadlines due to lack of effort.",
        "basic": "Possesses a strong willingness to work hard and sometimes long hours to get the job done. Has a track record of working hard.",
        "advanced": "Demonstrates relentless commitment and ownership; focuses efforts efficiently for maximum impact, consistently exceeding output expectations without prompting.",
        "mark_poor": 0,
        "mark_basic": 1,
        "mark_advanced": 2,
        "max_score": 2
    }
]

def analyze_transcript_with_llm(transcript_text: str) -> Dict[str, Any]:
    """
    Analyze transcript using OpenAI LLM.
    
    Args:
        transcript_text: The interview transcript
        
    Returns:
        Dictionary with scores array matching the JSON schema
        
    Raises:
        ValueError: If OpenAI API key is not set
        Exception: If API call fails
    """
    try:
        logger.info("Starting LLM analysis...")
        client = get_openai_client()
        
        # Get system instruction
        system_instruction = get_system_instruction()
        
        # Prepare the user message with transcript
        user_message = f"Interview transcript:\n\n{transcript_text}"
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o",  # Using GPT-4o for better analysis, can change to gpt-4 or gpt-3.5-turbo
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"},
            temperature=0.3  # Lower temperature for more consistent scoring
        )
        
        # Extract and parse JSON response
        content = response.choices[0].message.content
        logger.debug(f"Raw LLM response content: {content[:500]}...")  # Log first 500 chars
        
        try:
            result = json.loads(content)
            logger.debug(f"Parsed JSON result type: {type(result)}")
            logger.debug(f"Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.error(f"Content that failed to parse: {content}")
            raise
        
        # Validate the response structure
        if not isinstance(result, dict):
            logger.error(f"Result is not a dictionary, it's: {type(result)}")
            raise ValueError(f"Invalid response format: expected dict, got {type(result)}")
        
        if "scores" not in result:
            logger.error(f"Missing 'scores' key. Available keys: {list(result.keys())}")
            raise ValueError("Invalid response format: 'scores' key not found")
        
        # Validate that we have 7 scores
        scores = result["scores"]
        logger.debug(f"Scores type: {type(scores)}, length: {len(scores) if isinstance(scores, list) else 'N/A'}")
        logger.debug(f"Scores content: {scores}")
        
        if not isinstance(scores, list):
            logger.error(f"Scores is not a list, it's: {type(scores)}")
            raise ValueError(f"Invalid response format: 'scores' should be a list, got {type(scores)}")
        
        if len(scores) != 7:
            logger.warning(f"Expected 7 scores, got {len(scores)}")
            raise ValueError(f"Expected 7 scores, got {len(scores)}")
        
        # Check if scores are just integers (wrong format) or proper objects
        if scores and isinstance(scores[0], (int, float)):
            logger.error(f"LLM returned scores as numbers instead of objects. Scores: {scores}")
            raise ValueError(
                "Invalid response format: 'scores' should be a list of objects with 'criterion', 'level', 'mark', and 'justification' fields. "
                f"Got a list of numbers instead: {scores}. "
                "Please ensure the LLM returns the correct format."
            )
        
        # Validate feedback structure (optional, but preferred)
        logger.debug(f"Checking feedback. Result type: {type(result)}, 'feedback' in result: {'feedback' in result if isinstance(result, dict) else 'N/A'}")
        
        if not isinstance(result, dict):
            logger.error(f"Result is not a dict when checking feedback: {type(result)}")
            result = {}
        
        feedback_value = result.get("feedback")
        logger.debug(f"Feedback value type: {type(feedback_value)}, value: {feedback_value}")
        
        if "feedback" not in result or not isinstance(feedback_value, dict):
            logger.warning(f"Feedback missing or invalid type. Creating placeholder. Type was: {type(feedback_value)}")
            # Generate placeholder feedback if not provided or invalid type
            result["feedback"] = {
                "positive": ["Feedback generation pending", "Feedback generation pending"],
                "negative": ["Feedback generation pending", "Feedback generation pending"]
            }
        else:
            feedback = result["feedback"]
            logger.debug(f"Processing feedback dict: {feedback}")
            # Ensure feedback is a dictionary
            if not isinstance(feedback, dict):
                logger.warning(f"Feedback is not a dict, it's: {type(feedback)}. Creating new dict.")
                feedback = {}
                result["feedback"] = feedback
            
            # Validate and fix positive arguments
            positive_value = feedback.get("positive")
            logger.debug(f"Positive value type: {type(positive_value)}, value: {positive_value}")
            if "positive" not in feedback or not isinstance(positive_value, list):
                logger.warning(f"Positive missing or not a list. Type was: {type(positive_value)}")
                feedback["positive"] = []
            if len(feedback["positive"]) < 2:
                needed = 2 - len(feedback["positive"])
                logger.debug(f"Adding {needed} placeholder positive feedback items")
                feedback["positive"] = feedback["positive"] + ["Feedback generation pending"] * needed
            
            # Validate and fix negative arguments
            negative_value = feedback.get("negative")
            logger.debug(f"Negative value type: {type(negative_value)}, value: {negative_value}")
            if "negative" not in feedback or not isinstance(negative_value, list):
                logger.warning(f"Negative missing or not a list. Type was: {type(negative_value)}")
                feedback["negative"] = []
            if len(feedback["negative"]) < 2:
                needed = 2 - len(feedback["negative"])
                logger.debug(f"Adding {needed} placeholder negative feedback items")
                feedback["negative"] = feedback["negative"] + ["Feedback generation pending"] * needed
        
        # Validate each score has required fields
        required_fields = ["criterion", "level", "mark", "justification"]
        for i, score in enumerate(scores):
            logger.debug(f"Validating score {i}: type={type(score)}, value={score}")
            
            # Check if score is a dictionary
            if not isinstance(score, dict):
                logger.error(f"Score {i} is not a dictionary, it's: {type(score)}, value: {score}")
                raise ValueError(f"Score {i} should be a dictionary with fields {required_fields}, got {type(score)}: {score}")
            
            # Validate required fields
            for field in required_fields:
                if field not in score:
                    logger.error(f"Score {i} missing required field: {field}. Available fields: {list(score.keys())}")
                    raise ValueError(f"Score {i} missing required field: {field}")
            
            # Validate level and mark match
            level = score["level"]
            mark = score["mark"]
            criterion_name = score.get("criterion", "")
            
            # Find the max_score for this criterion
            max_score = 4  # default
            for rubric_item in SCORING_RUBRIC:
                if rubric_item["criterion"] == criterion_name:
                    max_score = rubric_item.get("max_score", 4)
                    break
            
            if level == "Poor" and mark != 0:
                score["mark"] = 0  # Auto-correct
            elif level == "Basic":
                if max_score == 4 and mark != 2:
                    score["mark"] = 2  # Auto-correct for role-based
                elif max_score == 2 and mark != 1:
                    score["mark"] = 1  # Auto-correct for cultural fit
            elif level == "Advanced":
                if max_score == 4 and mark != 4:
                    score["mark"] = 4  # Auto-correct for role-based
                elif max_score == 2 and mark != 2:
                    score["mark"] = 2  # Auto-correct for cultural fit
        
        logger.info("Successfully processed LLM response")
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}", exc_info=True)
        raise ValueError(f"Failed to parse JSON response from OpenAI: {str(e)}")
    except ValueError as e:
        logger.error(f"ValueError in LLM analysis: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in LLM analysis: {e}", exc_info=True)
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise Exception(f"Error calling OpenAI API: {str(e)}")

def get_system_instruction() -> str:
    """
    Generate the system instruction for LLM-based scoring
    """
    instruction = "You are an expert Interview Assessment AI. Your task is to analyze the provided interview transcript and assess the candidate based on the following 7 criteria. For each criterion, you must assign a **Level** (Poor, Basic, or Advanced) and provide a concise **Justification** based solely on the transcript evidence.\n\n"
    instruction += "--- SCORING SYSTEM ---\n"
    instruction += "**Role-based Skills (first 3 criteria):** Poor (0), Basic (2), Advanced (4) - Max score: 4 per criterion\n"
    instruction += "**Cultural Fit (last 4 criteria):** Poor (0), Basic (1), Advanced (2) - Max score: 2 per criterion\n\n"
    
    instruction += "--- SCORECARD CRITERIA ---\n"
    
    for i, item in enumerate(SCORING_RUBRIC):
        criterion = item["criterion"]
        max_score = item.get("max_score", 4)
        if i < 3:
            instruction += f"\n**ROLE-BASED SKILL: {criterion}**\n"
        else:
            instruction += f"\n**CULTURAL FIT: {criterion}**\n"
        instruction += f"Poor (0): {item['poor']}\n"
        if max_score == 4:
            instruction += f"Basic (2): {item['basic']}\n"
            instruction += f"Advanced (4): {item['advanced']}\n"
        else:
            instruction += f"Basic (1): {item['basic']}\n"
            instruction += f"Advanced (2): {item['advanced']}\n"
    
    instruction += "\n--- FEEDBACK GENERATION ---\n"
    instruction += "In addition to the scores, you must generate feedback arguments for the candidate:\n"
    instruction += "- 2 positive arguments (things the candidate did well or strengths demonstrated)\n"
    instruction += "- 2 negative arguments (areas for improvement or weaknesses observed)\n"
    instruction += "These should be specific, constructive, and based on evidence from the transcript.\n"
    instruction += "IMPORTANT: Write the feedback arguments using 'you' to directly address the candidate (e.g., 'You demonstrated...' not 'The candidate demonstrated...'). Make it personal and direct.\n"
    
    instruction += "\n--- OUTPUT FORMAT ---\n"
    instruction += "You MUST respond ONLY with a single JSON object that adheres to the following schema. DO NOT include any explanatory text, markdown formatting (like ```json), or notes outside the JSON structure itself.\n"
    instruction += 'The JSON MUST have this EXACT structure:\n'
    instruction += '{\n'
    instruction += '  "scores": [\n'
    instruction += '    {"criterion": "Analytical thinking and problem solving", "level": "Advanced", "mark": 4, "justification": "..."},\n'
    instruction += '    {"criterion": "Mastering analytical toolset (Python, ...)", "level": "Basic", "mark": 2, "justification": "..."},\n'
    instruction += '    ... (7 total score objects, one for each criterion)\n'
    instruction += '  ],\n'
    instruction += '  "feedback": {\n'
    instruction += '    "positive": ["arg1", "arg2"],\n'
    instruction += '    "negative": ["arg3", "arg4"]\n'
    instruction += '  }\n'
    instruction += '}\n'
    instruction += "\nCRITICAL: The 'scores' array MUST contain objects (dictionaries), NOT numbers. Each object must have 'criterion', 'level', 'mark', and 'justification' fields.\n"
    instruction += "IMPORTANT: For Cultural Fit criteria (last 4), marks are: Poor=0, Basic=1, Advanced=2. For Role-based Skills (first 3), marks are: Poor=0, Basic=2, Advanced=4."
    
    return instruction

def generate_score(transcript_text: str) -> Dict[str, Any]:
    """
    Generate score from interview transcript using the scoring rubric.
    
    Args:
        transcript_text: The full text of the interview transcript
        
    Returns:
        Dictionary containing:
        - overall_grade: Overall score/grade
        - total_score: Total marks out of 28 (7 criteria × 4 max)
        - max_score: Maximum possible score (28)
        - categories: List of category scores with justifications
        - scores: Raw scores array from LLM analysis
        - transcript_length: Length of transcript
        - word_count: Word count
    """
    # Basic metrics
    word_count = len(transcript_text.split())
    char_count = len(transcript_text)
    
    # Analyze transcript (placeholder - integrate LLM here)
    analysis_result = analyze_transcript_with_llm(transcript_text)
    scores = analysis_result.get("scores", [])
    
    # Calculate total score
    total_score = sum(score.get("mark", 0) for score in scores)
    # Max score: 3 role-based (4 each) + 4 cultural fit (2 each) = 12 + 8 = 20
    max_score = 20
    percentage = (total_score / max_score * 100) if max_score > 0 else 0
    
    # Final grade is the total score out of max score
    final_grade = f"{total_score}/{max_score}"
    
    # Format categories for display
    categories = []
    for score_item in scores:
        criterion = score_item.get("criterion", "Unknown")
        mark = score_item.get("mark", 0)
        level = score_item.get("level", "Poor")
        justification = score_item.get("justification", "")
        
        # Determine max_score based on criterion
        criterion_max = 4  # default
        for rubric_item in SCORING_RUBRIC:
            if rubric_item["criterion"] == criterion:
                criterion_max = rubric_item.get("max_score", 4)
                break
        
        categories.append({
            "name": criterion,
            "score": mark,
            "max_score": criterion_max,
            "level": level,
            "details": justification
        })
    
    # Extract feedback from analysis result
    feedback = analysis_result.get("feedback", {
        "positive": ["Feedback generation pending", "Feedback generation pending"],
        "negative": ["Feedback generation pending", "Feedback generation pending"]
    })
    
    return {
        "overall_grade": final_grade,  # Now shows "X/20" instead of letter
        "total_score": total_score,
        "max_score": max_score,
        "percentage": percentage,
        "categories": categories,
        "scores": scores,  # Raw scores array
        "feedback": feedback,  # Feedback with positive and negative arguments
        "transcript_length": char_count,
        "word_count": word_count,
        "metadata": {
            "transcript_preview": transcript_text[:200] + "..." if len(transcript_text) > 200 else transcript_text
        }
    }
