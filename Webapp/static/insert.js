document.addEventListener('DOMContentLoaded', async function() {
    const form = document.getElementById('insert-form');
    const qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
    const qrImage = document.getElementById('qrImage');
    const qrsize = document.getElementById('qrsize');
    const downloadBtn = document.getElementById('downloadBtn');
    const Size = document.getElementById('SizeInput');
    
    let responseData;
    let selectedSize = 100; // Set the initial size, you can change this to your default size

    function updateQRCodeSize() {
        selectedSize = qrsize.value;
        qrImage.style.width = selectedSize + 'px';
        qrImage.style.height = selectedSize + 'px';
        Size.value = selectedSize; // Update the hidden input field with the selected size
        sizeValue.textContent = selectedSize;
    }

    async function generateQRCodeAndShowModal() {
        const formData = new FormData(form);

        // Capture the selected size and store it in the formData
        formData.append('selected_size', selectedSize);

        try {
            const response = await fetch('/insert', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                responseData = await response.json();
                if (responseData.success) {
                    document.getElementById('title').value = '';
                    document.getElementById('year1').value = '';
                    document.getElementById('publisher').value = '';
                    qrImage.src = "data:image/png;base64," + responseData.qr_image_base64; // Set QR code image
                    console.log(qrImage)
                    qrModal.show();// Show the modal with the generated QR code
                    console.log(qrModal)
                    updateQRCodeSize();
                    
                } else {
                    // Handle error case
                    // Display flash messages

                    const flashMessages = document.querySelector('.flash-messages');
                    if (flashMessages) {
                        flashMessages.innerHTML = ''; // Clear any existing messages
                        const alert = document.createElement('div');
                        alert.className = 'alert alert-danger';
                        alert.textContent = 'There is something wrong..'; // Modify this message
                        flashMessages.appendChild(alert);
                    }
                }
            } else {
                const flashMessages = document.querySelector('.flash-messages');
                if (flashMessages) {
                    flashMessages.innerHTML = ''; // Clear any existing messages
                    const alert = document.createElement('div');
                    alert.className = 'alert alert-danger';
                    alert.textContent = 'There is something wrong..'; // Modify this message
                    flashMessages.appendChild(alert);
                }
                console.error('Response not OK');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent the default form submission

        // Generate QR code and insert data into the database
        await generateQRCodeAndShowModal();

        // Rest of your download code...
    });
    
    downloadBtn.addEventListener('click', async function() {
        // Generate QR code and insert data into the database
        

        // Create a new image element with the preferred size
        const downloadedImage = new Image();
        downloadedImage.src = qrImage.src;
        downloadedImage.style.width = selectedSize + 'px';
        downloadedImage.style.height = selectedSize + 'px';

        // Create a temporary canvas to draw the image with the preferred size
        const canvas = document.createElement('canvas');
        canvas.width = selectedSize;
        canvas.height = selectedSize;
        const context = canvas.getContext('2d');
        context.drawImage(downloadedImage, 0, 0, selectedSize, selectedSize);

        // Convert the canvas content to a data URL
        const dataURL = canvas.toDataURL('image/png');

        // Create an anchor element for downloading
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'qr_code.png';
        a.style.display = 'none';

        // Trigger the download by clicking the anchor element
        document.body.appendChild(a);
        a.click();

        // Clean up the anchor element
        document.body.removeChild(a);
    });
        
    // Update QR code size when the user selects a new size
    qrsize.addEventListener('input', updateQRCodeSize);
});