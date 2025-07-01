from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from pdfminer.high_level import extract_text
import requests
import json

app = Flask(__name__)
CORS(app)

# Get your free API key from https://console.groq.com/
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

def extract_resume(file_path):
    return extract_text(file_path)

def get_ai_feedback(resume_text):
    """Get AI feedback using Groq API"""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""
    Please analyze this resume and provide constructive feedback. Focus on:
    1. Structure and formatting
    2. Content quality and relevance
    3. Missing sections or information
    4. Strengths and areas for improvement
    5. Specific actionable recommendations

    Resume content:
    {resume_text[:3000]}  # Limit text length
    
    Provide feedback in a clear, helpful format with bullet points.
    """
    
    data = {
        "model": "llama3-8b-8192",  # Fast and free model
        "messages": [
            {
                "role": "system",
                "content": "You are an expert resume reviewer and career counselor. Provide helpful, constructive feedback to improve resumes."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 1000,
        "temperature": 0.7
    }
    
    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result['choices'][0]['message']['content']
        
    except requests.exceptions.RequestException as e:
        return f"Error connecting to AI service: {str(e)}"
    except KeyError as e:
        return f"Error parsing AI response: {str(e)}"
    except Exception as e:
        return f"Unexpected error: {str(e)}"

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if 'resume' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
            
        file = request.files['resume']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Please upload a PDF file"}), 400
            
        # Save uploaded file
        file_path = os.path.join("uploads", file.filename)
        os.makedirs("uploads", exist_ok=True)  # ✅ Ensure directory exists
        file.save(file_path)

        # Extract text from PDF
        resume_text = extract_resume(file_path)
        
        if not resume_text.strip():
            os.remove(file_path)
            return jsonify({"error": "Could not extract text from PDF"}), 400

        # Get AI feedback
        feedback = get_ai_feedback(resume_text)

        # Clean up uploaded file
        os.remove(file_path)

        return jsonify({
            "feedback": feedback,
            "word_count": len(resume_text.split()),
            "success": True
        })
        
    except Exception as e:
        return jsonify({"error": f"Error processing resume: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy", 
        "message": "Resume analyzer with Groq AI is running",
        "api_configured": bool(GROQ_API_KEY and GROQ_API_KEY != "your-groq-api-key-here")
    })

if __name__ == '__main__':
    if GROQ_API_KEY == "your-groq-api-key-here":
        print("⚠️  WARNING: Please set your Groq API key!")
        print("Get it free from: https://console.groq.com/")
    
    os.makedirs("uploads", exist_ok=True)
    print("🚀 Starting Resume Analyzer with Groq AI...")
    print("📡 Upload endpoint: http://localhost:5000/analyze")
    app.run(debug=True, host='0.0.0.0', port=5000)
