import sys
import json
import os
import warnings
warnings.filterwarnings('ignore')

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_engine import predict_engine, reset_engine_history

def handle_predict_stdin():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return
        payload = json.loads(raw)
        if isinstance(payload, list):
            results = []
            for item in payload:
                results.append(predict_engine(item))
            print(json.dumps({"success": True, "results": results}))
        else:
            result = predict_engine(payload)
            print(json.dumps({"success": True, "result": result}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    handle_predict_stdin()
