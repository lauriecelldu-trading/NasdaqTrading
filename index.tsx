/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from '@google/genai';

// --- DOM Elements ---
const tradePlanForm = document.getElementById('trade-plan-form') as HTMLFormElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const btnText = generateBtn.querySelector('.btn-text') as HTMLSpanElement;
const loader = generateBtn.querySelector('.loader') as HTMLDivElement;
const outputContainer = document.getElementById('output-container') as HTMLDivElement;

const nasdaqPriceInput = document.getElementById('nasdaq-price') as HTMLInputElement;
const chartImagesInput = document.getElementById('chart-images') as HTMLInputElement;
const chartNotesInput = document.getElementById('chart-notes') as HTMLTextAreaElement;
const economicEventsInput = document.getElementById('economic-events') as HTMLTextAreaElement;
const sentimentNotesInput = document.getElementById('sentiment-notes') as HTMLTextAreaElement;

// --- Gemini AI Setup ---
let ai: GoogleGenAI;
try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (error) {
    console.error(error);
    displayError('Failed to initialize AI. Please ensure the API key is set correctly.');
}

// --- Event Listeners ---
tradePlanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ai) {
        displayError('AI service is not available.');
        return;
    }

    setLoading(true);
    outputContainer.innerHTML = '<p>Generating your trading plan...</p>';
    outputContainer.classList.remove('error');

    try {
        const price = nasdaqPriceInput.value;
        const chartNotes = chartNotesInput.value;
        const economicEvents = economicEventsInput.value;
        const sentimentNotes = sentimentNotesInput.value;
        const files = chartImagesInput.files;

        const imageParts = files ? await Promise.all(Array.from(files).map(fileToGenerativePart)) : [];

        const prompt = `
You are a professional NASDAQ day trader with 40+ years of experience in futures markets, specialising in supply and demand, ICT concepts, and multi-timeframe analysis.

Create a concise day trading plan for NASDAQ based on the following inputs:
• Current price: ${price}
• Charts Analysis & Notes: ${chartNotes || 'Not provided.'}
• Economic calendar events: ${economicEvents || 'Not provided.'}
• Sentiment / Bias: ${sentimentNotes || 'Not provided.'}
${files && files.length > 0 ? `• User has provided ${files.length} chart image(s) for analysis.` : ''}

**IMPORTANT: You MUST follow this exact output format. Do not add any extra text before or after the plan.**

Here is an example of the required format:
---
Got it. Thanks for feeding me the 15-minute and 1-hour NASDAQ charts. Current price: 23,237. Let’s update the day trading plan clearly:

⸻

Day Trading Strategy – NASDAQ (23,237)

Scenarios
	1.	Bullish Setup (Relief Bounce / Intraday Reversal)
	•	Trigger: Price breaks and holds above 23,320–23,350.
	•	Entry Zone: 23,320–23,350.
	•	Stop Loss: Below 23,200.
	•	Targets:
	•	TP1: 23,490
	•	TP2: 23,600
	•	Stretch TP: 23,650.
Mindset: Take profits quicker if momentum slows—this is counter-trend until proven otherwise.

⸻

	2.	Bearish Continuation (Main Bias – Trend Down)
	•	Trigger: Price rejects 23,300–23,350 or breaks 23,200 cleanly.
	•	Entry Zone:
	•	First short: 23,300–23,350 (stop above 23,400).
	•	Second short: Break of 23,200 (stop above 23,280).
	•	Targets:
	•	TP1: 23,050
	•	TP2: 23,000
	•	Stretch TP: 22,950–22,900 if strong selling continues.
Mindset: This is aligned with higher-timeframe selling pressure. Be patient for clean rejection at supply.

⸻

Risk Management
	•	Max 1–1.5% of account per trade.
	•	Position size small (especially near CPI/PMI levels).
	•	Take partials at first target and trail stop to break-even.

⸻

Key Mindset Today
	•	Bias: Overall market is in strong sell mode (4H & daily trend still heavy).
	•	Discipline: Avoid chasing; wait for rejections or clean breakouts.
	•	Flexibility: Expect intraday volatility around PMI and Fed/trader flows; if momentum flips, cut losers fast.
	•	No overtrading: 2–3 high-quality trades max.

⸻

⚖️ Summary:
	•	Main plan: Short rejections around 23,320–23,350 or breakdown under 23,200 toward 23,050 → 23,000.
	•	Alternative plan: If price reclaims 23,350 and holds, scalp longs toward 23,600–23,650 with tight stops.
---

Now, generate the trading plan based on the user's inputs, strictly adhering to the format shown in the example. The introductory sentence should dynamically mention the charts provided (if any) and the current price.
`;

        const contents = {
            parts: [
                { text: prompt },
                ...imageParts,
            ]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
        });
        
        outputContainer.textContent = response.text;

    } catch (error) {
        console.error('Error generating trading plan:', error);
        displayError('An error occurred while generating the plan. Please check the console for details and try again.');
    } finally {
        setLoading(false);
    }
});


// --- Helper Functions ---

/**
 * Sets the loading state of the generate button.
 * @param isLoading - Whether the app is in a loading state.
 */
function setLoading(isLoading: boolean): void {
    generateBtn.disabled = isLoading;
    loader.hidden = !isLoading;
    btnText.textContent = isLoading ? 'Analyzing...' : 'Generate Plan';
}

/**
 * Displays an error message in the output container.
 * @param message - The error message to display.
 */
function displayError(message: string): void {
    outputContainer.innerHTML = `<p>${message}</p>`;
    outputContainer.classList.add('error');
}

/**
 * Converts a File object to a GoogleGenAI.Part object.
 * @param file - The file to convert.
 * @returns A promise that resolves to a Part object.
 */
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string; } }> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const data = await base64EncodedDataPromise;
  return {
    inlineData: {
      data,
      mimeType: file.type,
    },
  };
}
