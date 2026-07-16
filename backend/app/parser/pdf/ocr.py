import cv2
import pytesseract
import numpy as np
from pdf2image import convert_from_path
from typing import List, Dict, Any

def preprocess_image_for_ocr(image):
    """
    Grayscale, threshold, and deskew image for better OCR results.
    """
    # Convert to OpenCV format (numpy array)
    img_cv = np.array(image)
    if len(img_cv.shape) == 3 and img_cv.shape[2] == 3:
        gray = cv2.cvtColor(img_cv, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_cv
        
    # Apply thresholding
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    
    # Optional deskew logic would go here
    return thresh

def run_ocr_on_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Converts PDF to images and runs Tesseract OCR.
    """
    blocks = []
    # Convert PDF to list of PIL images
    pages = convert_from_path(file_path, dpi=300)
    
    for page_num, page_img in enumerate(pages):
        processed_img = preprocess_image_for_ocr(page_img)
        
        # Use pytesseract to extract data with bounding boxes
        data = pytesseract.image_to_data(processed_img, output_type=pytesseract.Output.DICT)
        
        for i in range(len(data['text'])):
            text = data['text'][i].strip()
            if text:
                blocks.append({
                    "text": text,
                    "size": data['height'][i], # Approximation of font size
                    "flags": 0, # Cannot easily get bold from OCR without advanced processing
                    "font": "ocr",
                    "bbox": (
                        data['left'][i], 
                        data['top'][i], 
                        data['left'][i] + data['width'][i], 
                        data['top'][i] + data['height'][i]
                    ),
                    "page_number": page_num + 1,
                    "type": "text"
                })
                
    return blocks
