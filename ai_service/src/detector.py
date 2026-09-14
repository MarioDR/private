import cv2
import argparse
import numpy as np
import os
from pathlib import Path
from ultralytics import YOLO

"""
Modulo: detector.py
Descrizione: Microservizio di vision (YOLOv8) per l'estrazione ROI di viso e corpo.
"""

from PIL import Image
from pillow_heif import register_heif_opener
register_heif_opener()

TARGET_SIZE = (224, 224)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DEFAULT_MODEL_PATH = os.path.join(BASE_DIR, "data", "models", "yolov8n-pose.pt")
DEFAULT_FACE_RAW_DIR = os.path.join(BASE_DIR, "data", "raw", "Face")
DEFAULT_BODY_RAW_DIR = os.path.join(BASE_DIR, "data", "raw", "Full-Body")

def get_face_bbox_from_keypoints(keypoints, img_w, img_h, padding=0.5):
    """
    Calcola le coordinate del bounding box facciale.
    """
    face_kpts = keypoints[:5]
    valid_kpts = [kp for kp in face_kpts if kp[0] > 0 and kp[1] > 0]
    
    if len(valid_kpts) < 2:
        return None
        
    kpts_array = np.array(valid_kpts)
    x_coords = kpts_array[:, 0]
    y_coords = kpts_array[:, 1]
    
    x_min, x_max = np.min(x_coords), np.max(x_coords)
    y_min, y_max = np.min(y_coords), np.max(y_coords)
    
    w = x_max - x_min
    h = y_max - y_min
    
    if w == 0: w = 20
    if h == 0: h = 20
    
    pad_w = w * padding
    pad_h = h * padding
    
    final_x_min = max(0, int(x_min - pad_w))
    final_y_min = max(0, int(y_min - pad_h))
    final_x_max = min(img_w, int(x_max + pad_w))
    final_y_max = min(img_h, int(y_max + pad_h))
    
    box_w = final_x_max - final_x_min
    box_h = final_y_max - final_y_min
    diff = abs(box_w - box_h)
    
    if box_w > box_h:
        final_y_min = max(0, int(final_y_min - diff/2))
        final_y_max = min(img_h, int(final_y_max + diff/2))
    elif box_h > box_w:
        final_x_min = max(0, int(final_x_min - diff/2))
        final_x_max = min(img_w, int(final_x_max + diff/2))
        
    return final_x_min, final_y_min, final_x_max, final_y_max

def apply_light_preprocessing(img):
    """
    Applica CLAHE (Contrast Limited Adaptive Histogram Equalization) al canale della luminosità
    per correggere problemi di illuminazione (es. controluce, ombre sul viso) mantenendo i colori originali.
    """
    # Conversione in spazio colore LAB
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Applicazione CLAHE 
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    
    # Merge dei canali e riconversione in BGR
    limg = cv2.merge((cl,a,b))
    final = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    
    return final

def process_frame(frame, model):
    img_h, img_w = frame.shape[:2]
    results = model(frame, verbose=False)
    
    face_rois = []
    body_rois = []
    
    for r in results:
        boxes = r.boxes
        keypoints = r.keypoints
        
        if boxes is None or keypoints is None:
            continue
            
        for i in range(len(boxes)):
            x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy().astype(int)
            
            body_roi = frame[y1:y2, x1:x2]
            if body_roi.size > 0:
                body_roi_resized = cv2.resize(body_roi, TARGET_SIZE)
                body_roi_preprocessed = apply_light_preprocessing(body_roi_resized)
                body_rois.append(body_roi_preprocessed)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
                cv2.putText(frame, "Body", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
            
            kpts = keypoints.xy[i].cpu().numpy()
            face_bbox = get_face_bbox_from_keypoints(kpts, img_w, img_h)
            
            if face_bbox is not None:
                fx1, fy1, fx2, fy2 = face_bbox
                face_roi = frame[fy1:fy2, fx1:fx2]
                if face_roi.size > 0:
                    face_roi_resized = cv2.resize(face_roi, TARGET_SIZE)
                    face_roi_preprocessed = apply_light_preprocessing(face_roi_resized)
                    face_rois.append(face_roi_preprocessed)
                    cv2.rectangle(frame, (fx1, fy1), (fx2, fy2), (0, 255, 0), 2)
                    cv2.putText(frame, "Face", (fx1, fy1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                    
    return frame, face_rois, body_rois

def main():
    parser = argparse.ArgumentParser(description="Lab-Safe OpenCV Layer")
    parser.add_argument("--mode", type=str, required=True, choices=["webcam", "image", "folder", "server"], help="Modalità di esecuzione: 'webcam', 'image', 'folder' o 'server'")
    parser.add_argument("--source", type=str, default="", help="Percorso dell'immagine o della cartella (richiesto se mode='image' o 'folder')")
    parser.add_argument("--output", type=str, default="", help="Percorso personalizzato di output dove salvare i ritagli (opzionale)")
    args = parser.parse_args()

    print(f"[INFO] Caricamento modello YOLOv8 Pose da: {DEFAULT_MODEL_PATH}")
    if not os.path.exists(DEFAULT_MODEL_PATH):
        print(f"[ERRORE] File modello non trovato in {DEFAULT_MODEL_PATH}. Controlla la cartella data/models/")
        return
    model = YOLO(DEFAULT_MODEL_PATH)
    
    if args.mode == "image":
        if not args.source:
            print("[ERRORE] Devi specificare --source se usi --mode image")
            return
            
        print(f"[INFO] Elaborazione immagine: {args.source}")
        file_path = Path(args.source)
        if file_path.suffix.lower() in [".heic", ".heif"]:
            try:
                pil_img = Image.open(str(file_path)).convert('RGB')
                frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception as e:
                print(f"[ERRORE] Impossibile leggere il file HEIC: {e}")
                return
        else:
            frame = cv2.imread(args.source)

        if frame is None:
            print("[ERRORE] Impossibile caricare l'immagine.")
            return
            
        out_frame, face_rois, body_rois = process_frame(frame, model)
        
        cv2.imshow("Lab-Safe - Rilevamento", out_frame)
        for idx, (f_roi, b_roi) in enumerate(zip(face_rois, body_rois)):
            cv2.imshow(f"Viso {idx}", f_roi)
            cv2.imshow(f"Corpo {idx}", b_roi)
            
        print("[INFO] Premi un tasto qualsiasi per uscire...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
    elif args.mode == "webcam":
        print("[INFO] Avvio webcam... (Premi 'q' per uscire)")
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("[ERRORE] Impossibile accedere alla webcam.")
            return
            
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            out_frame, face_rois, body_rois = process_frame(frame, model)
            
            cv2.imshow("Lab-Safe - Rilevamento Real-Time", out_frame)
            
            if len(face_rois) > 0:
                cv2.imshow("ROI Viso", face_rois[0])
            if len(body_rois) > 0:
                cv2.imshow("ROI Corpo", body_rois[0])
                
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
        cap.release()
        cv2.destroyAllWindows()

    elif args.mode == "folder":
        if not args.source:
            print("[ERRORE] Devi specificare --source se usi --mode folder")
            return
            
        folder_path = Path(args.source)
        if not folder_path.is_dir():
            print(f"[ERRORE] Il percorso specificato non è una cartella: {args.source}")
            return
        if args.output:
            custom_out = Path(args.output)
            session_face_dir = os.path.join(custom_out, "Face", folder_path.name)
            session_body_dir = os.path.join(custom_out, "Full-Body", folder_path.name)
        else:
            session_face_dir = os.path.join(DEFAULT_FACE_RAW_DIR, folder_path.name)
            session_body_dir = os.path.join(DEFAULT_BODY_RAW_DIR, folder_path.name)
            
        os.makedirs(session_face_dir, exist_ok=True)
        os.makedirs(session_body_dir, exist_ok=True)
        valid_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".heic", ".heif"}
        print(f"[INFO] Elaborazione e salvataggio in:\n -> {session_face_dir}\n -> {session_body_dir}")
        
        for file_path in folder_path.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in valid_extensions:
                if file_path.suffix.lower() in [".heic", ".heif"]:
                    try:
                        pil_img = Image.open(str(file_path)).convert('RGB')
                        frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                    except Exception as e:
                        print(f"[WARNING] Errore di lettura HEIC su {file_path.name}: {e}")
                        continue
                else:
                    frame = cv2.imread(str(file_path))

                if frame is None:
                    print(f"[WARNING] Impossibile caricare l'immagine: {file_path.name}")
                    continue
                    
                _, face_rois, body_rois = process_frame(frame, model)
                
                for idx, f_roi in enumerate(face_rois):
                    save_path = os.path.join(session_face_dir, f"{file_path.stem}_face_{idx}.jpg")
                    cv2.imwrite(save_path, f_roi)
                    
                for idx, b_roi in enumerate(body_rois):
                    save_path = os.path.join(session_body_dir, f"{file_path.stem}_body_{idx}.jpg")
                    cv2.imwrite(save_path, b_roi)
                    
        print("[INFO] Elaborazione cartella completata ed esportata nel dataset.")

    elif args.mode == "server":
        from http.server import BaseHTTPRequestHandler, HTTPServer
        import json
        import base64
        
        class APIHandler(BaseHTTPRequestHandler):
            def _set_headers(self):
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
            def do_POST(self):
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                try:
                    data = json.loads(post_data.decode('utf-8'))
                    img_data = data.get('image', '')
                    if img_data.startswith('data:image'):
                        img_data = img_data.split(',')[1]
                    
                    img_bytes = base64.b64decode(img_data)
                    np_arr = np.frombuffer(img_bytes, np.uint8)
                    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                    
                    if frame is None:
                        raise ValueError("Immagine non decodificabile")
                        
                    _, face_rois, body_rois = process_frame(frame, model)
                    
                    def rois_to_base64(rois):
                        b64_list = []
                        for roi in rois:
                            _, buffer = cv2.imencode('.jpg', roi)
                            b64_str = base64.b64encode(buffer).decode('utf-8')
                            b64_list.append(f"data:image/jpeg;base64,{b64_str}")
                        return b64_list
                        
                    response = {
                        "status": "ok",
                        "face_rois": rois_to_base64(face_rois),
                        "body_rois": rois_to_base64(body_rois)
                    }
                except Exception as e:
                    print(f"[ERRORE] Elaborazione frame fallita: {e}")
                    response = {"status": "error", "message": str(e)}
                    
                self._set_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))

        server_address = ('127.0.0.1', 5000)
        httpd = HTTPServer(server_address, APIHandler)
        print("[INFO] Server Python (YOLOv8 Pose) in ascolto su http://127.0.0.1:5000 ...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        httpd.server_close()
        print("[INFO] Server Python fermato.")

if __name__ == "__main__":
    main()