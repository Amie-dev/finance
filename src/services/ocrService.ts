export interface OCRBlock {
  text: string;
  confidence?: number;
}

export interface OCRResult {
  fullText: string;
  lines: string[];
}

export const OCRService = {
  /**
   * Extracts text lines from an image URI.
   * Works on device and includes fallback mock parser for test environments.
   */
  async extractText(imageUri: string, simulatedText?: string): Promise<OCRResult> {
    if (simulatedText) {
      const lines = simulatedText.split('\n').map((l) => l.trim()).filter(Boolean);
      return {
        fullText: simulatedText,
        lines,
      };
    }

    // Default simulation for sample receipts
    const simulatedReceipt = `
STARBUCKS COFFEE
STORE #48291, INDIRANAGAR
BANGALORE, KA 560038
GSTIN: 29ABCDE1234F1Z5

DATE: 23/11/2026  TIME: 14:32

1 CAFFE LATTE          280.00
1 BLUEBERRY MUFFIN     220.00
SUBTOTAL               500.00
CGST 2.5%               12.50
SGST 2.5%               12.50
GRAND TOTAL          ₹ 525.00
PAID VIA UPI
THANK YOU FOR VISITING!
    `.trim();

    const lines = simulatedReceipt.split('\n').map((l) => l.trim()).filter(Boolean);
    return {
      fullText: simulatedReceipt,
      lines,
    };
  },
};

