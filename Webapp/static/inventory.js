document.addEventListener('DOMContentLoaded', function () {
    const shelfSelect = document.getElementById('shelf_id');
    const selectedShelfValue = document.getElementById('selected-shelf-value');
    const catSelect = document.getElementById('catalog');
    const selectedCatalogueValue = document.getElementById('selected-category-value');
    const searchInput = document.getElementById('search_query');
    const inventoryForm = document.getElementById('inventory-form');
    let originalData = [];

    searchInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission
        }
    });

    function fetchInventory() {
        const selectedShelf = shelfSelect.value;
        const selectedCategory = catSelect.value;
        const searchQuery = searchInput.value;

        fetch(`/inventory?shelf_id=${selectedShelf}&catalog=${selectedCategory}&search_query=${searchQuery}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                originalData = data;
                updateTable(data);
            })
            .catch(error => {
                console.error('Fetch error:', error);
            });
    }

    if (inventoryForm) {
        inventoryForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent default form submission
            fetchInventory(); // Fetch data when the form is submitted
        });
    }
    searchInput.addEventListener('input', function () {
        const searchQuery = searchInput.value.toLowerCase(); // Convert to lowercase for case-insensitive search
        filterAndDisplayData(searchQuery);
    });

    shelfSelect.addEventListener('change', function () {
        document.getElementById('search_query').value = '';
        const selectedShelf = shelfSelect.value;
        console.log('Selected Shelf:', selectedShelf);
        selectedShelfValue.textContent = selectedShelf;
        const selectedCatalogue = catSelect.value;
        selectedCatalogueValue.textContent = selectedCatalogue;

        if (selectedShelf === 'shelf0') {
            catSelect.disabled = true;
            catSelect.value = 'all';
        } else {
            catSelect.disabled = false;
        }

        // Make a GET request using the fetch API
        fetchInventory();
    });

    catSelect.addEventListener('change', function () {
        document.getElementById('search_query').value = '';
        const selectedCatalogue = catSelect.value;
        selectedCatalogueValue.textContent = selectedCatalogue;

        // Perform a fetch request based on the selected shelf and category
        fetchInventory();
    });

    function filterAndDisplayData(searchQuery) {
        const filteredData = originalData.filter(item => {
            return item.title.toLowerCase().includes(searchQuery) || item.publisher.toLowerCase().includes(searchQuery);
        });

        updateTable(filteredData);
    }

    // Function to update the table with new data
    function updateTable(data) {
        const booksTableBody = document.getElementById('table-body');
        booksTableBody.innerHTML = ''; // Clear existing table data

        data.forEach(row => {
            const newRow = booksTableBody.insertRow();
            const qrCell = newRow.insertCell();
            const qrImage = new Image();
            qrImage.src = `/qr_codes/${row.qrcode}`;
            qrImage.alt = 'QR Code';
            qrImage.classList.add('qr-code-size');
            qrCell.appendChild(qrImage);
            newRow.insertCell().textContent = row.category;
            newRow.insertCell().textContent = row.title;
            newRow.insertCell().textContent = row.publisher;
            newRow.insertCell().textContent = row.year;
        });
    }
});
