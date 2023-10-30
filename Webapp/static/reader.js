document.addEventListener("DOMContentLoaded", function () {
    const videoElement = document.getElementById("qr-video");
    const startButton = document.getElementById("start-button");
    const stopButton = document.getElementById("stop-button");
    const resultElement = document.getElementById("result");

    let videoStream;

    // Click event handler for the Start Camera button
    startButton.addEventListener("click", async () => {
        try {
            // Get access to the user's camera
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });

            // Assign the camera stream to the video element
            videoElement.srcObject = videoStream;

            // Start the video stream
            videoElement.play();
        } catch (error) {
            console.error("Error accessing the camera: ", error);
        }
    });

    // Click event handler for the Stop Camera button
    stopButton.addEventListener("click", () => {
        // Stop the video stream and release the camera
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
    });

    // Continuously capture frames and process for QR code detection
    videoElement.addEventListener("play", function () {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        const handleFrame = () => {
            if (videoElement.paused || videoElement.ended) {
                return;
            }

            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                resultElement.innerText = "QR Code Detected: " + code.data;
            }

            requestAnimationFrame(handleFrame);
        };

        requestAnimationFrame(handleFrame);
    });
});