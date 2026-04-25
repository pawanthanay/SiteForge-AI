import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ensure the target directory for generated sites exists
const SITES_DIR = path.join(__dirname, 'generated-sites');
if (!fs.existsSync(SITES_DIR)) {
  fs.mkdirSync(SITES_DIR, { recursive: true });
}

// Serve static html files directly
app.use('/generated-sites', express.static(SITES_DIR));

app.post('/generate', async (req, res) => {
  const { keyword } = req.body;
  
  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    // Model fallback: 'gemini-3.0-flash-lite' (or 'gemini-2.5-flash', etc.)
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Using fetch directly removes extra SDK dependencies / version bloat
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: `Create a visually stunning, premium website strictly focused on this exact topic/industry: "${keyword}". All text, branding, and content must perfectly match the context of a ${keyword} business.` }]
        }],
        systemInstruction: {
          parts: [{ text: "You are an expert, award-winning frontend designer. Generate a single HTML file with embedded Tailwind CSS via CDN. Design aesthetic MUST BE a maximal, rich, exceptionally clean UI. Prioritize extremely generous whitespace and perfect padding. COLOR PALETTE: strictly use a cohesive modern palette (e.g., slate-900 foundation with one accent color). IMAGE RULES: To guarantee beautifully loaded images and zero black boxes, you MUST ONLY use these EXACT premium Unsplash URLs natively in <img> tags or inline style='background-image:...': Hero Image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'. Feature Image 1: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'. Feature Image 2: 'https://images.unsplash.com/photo-1550859491-1fa114b7e1c8?auto=format&fit=crop&w=800&q=80'. NEVER generate random image URLs. Give images 'rounded-2xl' and 'shadow-2xl' Tailwind classes for a stunning look. Include cohesive sections: Navbar, Hero, Features/Services, Testimonials, Footer. DO NOT wrap output in markdown. Return ONLY the raw valid HTML string." }]
        },
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'Gemini API Error');
    }

    let htmlContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!htmlContent) {
        throw new Error('No content returned from AI');
    }

    // Attempt clean up of code formatting blocks just in case
    htmlContent = htmlContent.replace(/^```html\s*|```\s*$/gi, '').trim();

    const filename = `site-${Date.now()}.html`;
    const filepath = path.join(SITES_DIR, filename);

    fs.writeFileSync(filepath, htmlContent);

    // Return the URL for the extension to open
    res.json({ url: `http://localhost:${PORT}/generated-sites/${filename}` });
  } catch (error) {
    console.error("Error generating site:", error);
    res.status(500).json({ error: error.message || 'Failed to generate website' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
