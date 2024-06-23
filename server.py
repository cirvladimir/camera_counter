from flask import Flask, request
import cv2
import numpy as np
import base64
import json
from counter import count_sheets

app = Flask(__name__)

@app.route("/", methods=["GET"])
def index():
    # Serve the HTML page
    with open("index.html", "rb") as f:
        return f.read()

@app.route("/upload", methods=["POST"])
def upload():
    # Receive image data from request
    data = request.get_json()
    image_data = data['image']
    rectangle = data['rectangle']


    try:
        # Decode and convert to numpy array
        image_bytes = base64.b64decode(image_data)
        image_array = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_UNCHANGED)

        # Save the image
        # cv2.imwrite("uploaded_image.jpg", image)
        
        # Process the image and get the desired result
        points = count_sheets(image, rectangle)

        # Convert the result to JSON
        result_json = json.dumps({"points": points})

        # Return the JSON response
        return result_json

    except Exception as e:
        print(f"Error processing image: {e}")
        return "Error uploading image!", 500

if __name__ == "__main__":
    app.run(debug=True, port=3000)