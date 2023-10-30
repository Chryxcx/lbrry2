document.addEventListener("DOMContentLoaded", function () {
    const videoElement = document.getElementById("qr-video");

    // Check if the browser supports getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function (stream) {
                // Set the video source to the camera stream
                videoElement.srcObject = stream;
            })
            .catch(function (error) {
                console.error("Error accessing the camera: ", error);
            });
    } else {
        console.error("getUserMedia is not supported in this browser.");
    }
});
