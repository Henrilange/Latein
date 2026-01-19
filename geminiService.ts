
import { GoogleGenAI, Type } from "@google/genai";
import { Vocab } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Service to handle Gemini operations
 */
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  /**
   * Translates Latin text strictly using a provided vocabulary context.
   */
  async translateLatinText(text: string, vocabList: Vocab[]): Promise<string> {
    const vocabCtx = vocabList.map(v => `${v.la}=${v.de}`).join('\n');
    
    const prompt = `Du bist ein SEHR STRIKTER Lateinlehrer. KRITISCHE REGELN - ABSOLUT NICHT BRECHEN:

1. VOKABELLISTE - DAS IST DIE EINZIGE QUELLE:
${vocabCtx}

2. FÜR JEDES WORT:
   - Finde die Grundform (z.B. "ardet" -> "ardere", "puellam" -> "puella")
   - Prüfe: IST die Grundform in der obigen Liste?
   - JA -> übersetze mit korrekter deutscher Grammatik
   - NEIN -> schreibe '[unbekannt]'
   
3. EIGENNAMEN (Marcus, Roma, Caesar, Venus, Iulia, Claudius etc.) bleiben im Original.

4. NUTZE KEINE EIGENEN VOKABELKENNTNISSE! NUR DIE LISTE.
   - WENN EIN WORT NICHT IN DER LISTE STEHT -> '[unbekannt]'

5. Antworte NUR mit der deutschen Übersetzung, keine Erklärungen oder Einleitungen.

Lateinischer Text: ${text}`;

    try {
      const response = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });
      return response.text || "Übersetzung fehlgeschlagen.";
    } catch (error) {
      console.error("Gemini Translation Error:", error);
      throw error;
    }
  }

  /**
   * Extracts vocabulary pairs from an image.
   */
  async extractVocabFromImage(base64Image: string): Promise<Vocab[]> {
    const prompt = "Extrahiere Vokabeln aus diesem Bild. Format: Latein - Deutsch. Pro Zeile ein Paar. Gib NUR die Vokabeln zurück.";
    
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                la: { type: Type.STRING, description: "Latin word" },
                de: { type: Type.STRING, description: "German translation" }
              },
              required: ["la", "de"]
            }
          }
        }
      });

      const jsonStr = response.text.trim();
      return JSON.parse(jsonStr) as Vocab[];
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      throw error;
    }
  }

  /**
   * Extracts raw Latin text from an image, explicitly removing numbers.
   */
  async extractTextFromImage(base64Image: string): Promise<string> {
    const prompt = "Extrahiere den gesamten lateinischen Text aus diesem Bild. WICHTIG: Entferne alle Zahlen (wie z.B. Zeilennummern). Gib nur den reinen Text zurück, ohne zusätzliche Erklärungen oder Formatierungen.";
    
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } }
          ]
        }
      });
      return response.text || "";
    } catch (error) {
      console.error("Gemini Text OCR Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
