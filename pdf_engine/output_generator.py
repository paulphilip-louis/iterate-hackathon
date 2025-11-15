"""
Module for generating structured output files in various formats
"""
import json
import csv
import os
from datetime import datetime
from typing import Dict, Any, List

def create_structured_output(score_data: Dict[str, Any], output_dir: str = "outputs") -> Dict[str, str]:
    """
    Create structured output files in multiple formats (JSON, CSV, Markdown)
    
    Args:
        score_data: Dictionary containing score information
        output_dir: Directory to save output files
        
    Returns:
        Dictionary with paths to created files
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate timestamp for unique filenames
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    output_files = {}
    
    # Generate JSON output
    json_path = os.path.join(output_dir, f"scorecard_{timestamp}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(score_data, f, indent=2, ensure_ascii=False)
    output_files['json'] = json_path
    
    # Generate CSV output (for table data)
    csv_path = os.path.join(output_dir, f"scorecard_{timestamp}.csv")
    create_csv_output(score_data, csv_path)
    output_files['csv'] = csv_path
    
    # Generate Markdown output (human-readable)
    md_path = os.path.join(output_dir, f"scorecard_{timestamp}.md")
    create_markdown_output(score_data, md_path)
    output_files['markdown'] = md_path
    
    return output_files

def create_csv_output(score_data: Dict[str, Any], csv_path: str):
    """
    Create CSV file with score data in table format
    """
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Write header
        writer.writerow(['Category', 'Score', 'Max Score', 'Percentage', 'Details'])
        
        # Write overall grade row
        writer.writerow(['Overall Grade', score_data.get('overall_grade', 'N/A'), '', '', ''])
        
        # Write category rows
        categories = score_data.get('categories', [])
        for category in categories:
            score = category.get('score', 0)
            max_score = category.get('max_score', 0)
            percentage = (score / max_score * 100) if max_score > 0 else 0
            writer.writerow([
                category.get('name', 'Unknown'),
                score,
                max_score,
                f"{percentage:.1f}%",
                category.get('details', '')
            ])
        
        # Write metadata rows
        writer.writerow([])
        writer.writerow(['Metadata', 'Value', '', '', ''])
        writer.writerow(['Total Questions', score_data.get('total_questions', 0), '', '', ''])
        writer.writerow(['Word Count', score_data.get('word_count', 0), '', '', ''])
        writer.writerow(['Transcript Length', score_data.get('transcript_length', 0), '', '', ''])

def create_markdown_output(score_data: Dict[str, Any], md_path: str):
    """
    Create Markdown file with formatted score report
    """
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write("# Interview Scorecard Report\n\n")
        f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        # Overall Grade
        f.write("## Overall Grade\n\n")
        f.write(f"### {score_data.get('overall_grade', 'N/A')}\n\n")
        
        # Summary Table
        f.write("## Summary\n\n")
        f.write("| Metric | Value |\n")
        f.write("|--------|-------|\n")
        f.write(f"| Total Questions | {score_data.get('total_questions', 0)} |\n")
        f.write(f"| Word Count | {score_data.get('word_count', 0)} |\n")
        f.write(f"| Transcript Length | {score_data.get('transcript_length', 0)} characters |\n\n")
        
        # Categories Table
        f.write("## Category Scores\n\n")
        f.write("| Category | Score | Max Score | Percentage | Details |\n")
        f.write("|----------|-------|-----------|------------|----------|\n")
        
        categories = score_data.get('categories', [])
        for category in categories:
            score = category.get('score', 0)
            max_score = category.get('max_score', 0)
            percentage = (score / max_score * 100) if max_score > 0 else 0
            f.write(f"| {category.get('name', 'Unknown')} | {score} | {max_score} | {percentage:.1f}% | {category.get('details', '')} |\n")
        
        f.write("\n")
        
        # Detailed Scores (if available)
        detailed_scores = score_data.get('detailed_scores', {})
        if detailed_scores:
            f.write("## Detailed Scores\n\n")
            f.write("```json\n")
            f.write(json.dumps(detailed_scores, indent=2))
            f.write("\n```\n\n")

def create_html_output(score_data: Dict[str, Any]) -> str:
    """
    Create HTML output for display in Gradio
    
    Args:
        score_data: Dictionary containing score information
        
    Returns:
        HTML string with formatted scorecard
    """
    final_grade = score_data.get('overall_grade', 'N/A')  # Now contains "X/20" format
    total_score = score_data.get('total_score', 0)
    max_score = score_data.get('max_score', 20)
    percentage = score_data.get('percentage', 0)
    word_count = score_data.get('word_count', 0)
    transcript_length = score_data.get('transcript_length', 0)
    categories = score_data.get('categories', [])
    scores = score_data.get('scores', [])
    feedback = score_data.get('feedback', {
        "positive": ["Feedback generation pending", "Feedback generation pending"],
        "negative": ["Feedback generation pending", "Feedback generation pending"]
    })
    
    # Determine grade color based on percentage
    if percentage >= 85:
        grade_color = '#28a745'  # Green
    elif percentage >= 70:
        grade_color = '#17a2b8'  # Blue
    elif percentage >= 55:
        grade_color = '#ffc107'  # Yellow
    elif percentage >= 40:
        grade_color = '#fd7e14'  # Orange
    else:
        grade_color = '#dc3545'  # Red
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                margin-bottom: 30px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }}
            .header h1 {{
                margin: 0;
                font-size: 2.5em;
            }}
            .header .timestamp {{
                margin-top: 10px;
                opacity: 0.9;
                font-size: 0.9em;
            }}
            .grade-display {{
                text-align: center;
                background: white;
                padding: 40px;
                border-radius: 10px;
                margin-bottom: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .grade-display .grade {{
                font-size: 5em;
                font-weight: bold;
                color: {grade_color};
                margin: 10px 0;
            }}
            .section {{
                background: white;
                padding: 25px;
                border-radius: 10px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .section h2 {{
                color: #667eea;
                border-bottom: 3px solid #667eea;
                padding-bottom: 10px;
                margin-top: 0;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }}
            th {{
                background-color: #667eea;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
            }}
            td {{
                padding: 12px;
                border-bottom: 1px solid #e0e0e0;
            }}
            tr:hover {{
                background-color: #f5f5f5;
            }}
            .metric-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }}
            .metric-card {{
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            }}
            .metric-card .value {{
                font-size: 2em;
                font-weight: bold;
                color: #667eea;
            }}
            .metric-card .label {{
                color: #666;
                margin-top: 5px;
                font-size: 0.9em;
            }}
            .progress-bar {{
                width: 100%;
                height: 25px;
                background-color: #e0e0e0;
                border-radius: 12px;
                overflow: hidden;
                margin-top: 5px;
            }}
            .progress-fill {{
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                transition: width 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 0.85em;
            }}
            .details-section {{
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin-top: 10px;
                border-left: 4px solid #667eea;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎯 Interview Scorecard Report</h1>
            <div class="timestamp">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>
        
        <div class="grade-display">
            <div style="font-size: 1.2em; color: #666; margin-bottom: 10px;">Final Grade</div>
            <div class="grade">{final_grade}</div>
        </div>
        
        <div class="section">
            <h2>📋 Role-based Skills</h2>
            <table>
                <thead>
                    <tr>
                        <th>Criterion</th>
                        <th>Level</th>
                        <th>Mark</th>
                        <th>Max</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    # Level colors
    level_colors = {
        'Poor': '#dc3545',
        'Basic': '#ffc107',
        'Advanced': '#28a745'
    }
    
    # Separate role-based (first 3) and cultural fit (last 4)
    role_based_criteria = categories[:3]
    cultural_fit_criteria = categories[3:]
    
    # Add role-based category rows
    for category in role_based_criteria:
        name = category.get('name', 'Unknown')
        score = category.get('score', 0)
        max_score = category.get('max_score', 4)  # Should be 4 for role-based
        level = category.get('level', 'Poor')
        justification = category.get('details', '')
        level_color = level_colors.get(level, '#6c757d')
        
        html += f"""
                    <tr>
                        <td><strong>{name}</strong></td>
                        <td><span style="color: {level_color}; font-weight: bold;">{level}</span></td>
                        <td><strong>{score}</strong></td>
                        <td>{max_score}</td>
                    </tr>
        """
        
        if justification and justification != "Analysis pending - LLM integration required.":
            html += f"""
                    <tr>
                        <td colspan="4">
                            <div class="details-section">
                                <strong>Justification:</strong> {justification}
                            </div>
                        </td>
                    </tr>
            """
    
    html += """
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>📋 Cultural Fit</h2>
            <table>
                <thead>
                    <tr>
                        <th>Criterion</th>
                        <th>Level</th>
                        <th>Mark</th>
                        <th>Max</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    # Add cultural fit category rows
    for category in cultural_fit_criteria:
        name = category.get('name', 'Unknown')
        score = category.get('score', 0)
        max_score = category.get('max_score', 2)
        level = category.get('level', 'Poor')
        justification = category.get('details', '')
        level_color = level_colors.get(level, '#6c757d')
        
        html += f"""
                    <tr>
                        <td><strong>{name}</strong></td>
                        <td><span style="color: {level_color}; font-weight: bold;">{level}</span></td>
                        <td><strong>{score}</strong></td>
                        <td>{max_score}</td>
                    </tr>
        """
        
        if justification and justification != "Analysis pending - LLM integration required.":
            html += f"""
                    <tr>
                        <td colspan="4">
                            <div class="details-section">
                                <strong>Justification:</strong> {justification}
                            </div>
                        </td>
                    </tr>
            """
    
    html += """
                </tbody>
            </table>
        </div>
    """
    
    # Add feedback section
    positive_args = feedback.get("positive", ["Feedback generation pending", "Feedback generation pending"])
    negative_args = feedback.get("negative", ["Feedback generation pending", "Feedback generation pending"])
    
    # Ensure we have at least 2 of each
    while len(positive_args) < 2:
        positive_args.append("Feedback generation pending")
    while len(negative_args) < 2:
        negative_args.append("Feedback generation pending")
    
    html += f"""
        <div class="section">
            <h2>💬 Suggested Feedback</h2>
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0; line-height: 1.8;">
                <p>Hi,</p>
                
                <p>Thank you so much with the time spent with us so far. We really enjoyed learning more about you and what you would want to achieve as part of our company. Overall, we really enjoyed that:</p>
                
                <ul style="list-style: none; padding-left: 0;">
                    <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                        <span style="position: absolute; left: 0;">(+)</span>
                        {positive_args[0]}
                    </li>
                    <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                        <span style="position: absolute; left: 0;">(+)</span>
                        {positive_args[1]}
                    </li>
                </ul>
                
                <p>That said, feedback culture is important. We would like to share improvements you could have made.</p>
                
                <ul style="list-style: none; padding-left: 0;">
                    <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                        <span style="position: absolute; left: 0;">(-)</span>
                        {negative_args[0]}
                    </li>
                    <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                        <span style="position: absolute; left: 0;">(-)</span>
                        {negative_args[1]}
                    </li>
                </ul>
                
                <p>We continually strive to give feedback that is transparent and direct, even if it can never be fully exhaustive. Please let me know if there is anything you want to discuss.</p>
                
                <p>Best,</p>
            </div>
        </div>
    """
    
    # Add raw scores JSON section
    if scores:
        html += f"""
        <div class="section">
            <h2>🔍 Raw Scores Data (JSON)</h2>
            <pre style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 0.9em;">{json.dumps({"scores": scores}, indent=2, ensure_ascii=False)}</pre>
        </div>
        """
    
    html += """
    </body>
    </html>
    """
    
    return html

