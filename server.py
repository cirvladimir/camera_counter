from flask import Flask, request
import cv2
import numpy as np
import base64

app = Flask(__name__)

@app.route("/", methods=["GET"])
def index():
    # Serve the HTML page
    with open("index.html", "rb") as f:
        return f.read()

@app.route("/upload", methods=["POST"])
def upload():
    # Receive image data from request
    image_data = request.data

    try:
        # Decode and convert to numpy array
        image_base64 = image_data.replace(b"data:image/jpeg;base64,", b"")
        image_bytes = base64.decodebytes(image_base64)
        image_array = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_UNCHANGED)
        print(image.shape)

        # Save the image
        cv2.imwrite("uploaded_image.jpg", image)
        return "Image uploaded successfully!"

    except Exception as e:
        print(f"Error processing image: {e}")
        return "Error uploading image!", 500

if __name__ == "__main__":
    app.run(debug=True, port=3000)