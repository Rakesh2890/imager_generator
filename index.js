// Select elements
let generateImageForm = document.getElementById('generate-image-form');
let formInput = document.getElementById('input-value');
let imageContainerText = document.getElementById('imageContainerText');
let imageGenerated = document.getElementById('generated-image');
let imageContainer = document.getElementById('images-visible');

// Function to fetch images from backend API
async function fetchImages(prompt) {
    try {
        // Show loading message
        imageContainerText.innerText = "🎨 Generating image... Please wait 15–150 seconds.";
        imageContainer.style.display = "block";
        imageGenerated.src = ""; // Clear previous image

        // Send POST request to your backend (via Netlify proxy)
        const response = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        });

        // Log HTTP status for debugging
        console.log("Raw response status:", response.status, response.statusText);

        // Read raw response text for debugging before parsing
        const rawText = await response.text().catch(err => {
            console.error("Error reading response text:", err);
            return null;
        });
        console.log("Raw response text:", rawText);

        // Try parsing JSON safely
        let data = null;
        if (rawText) {
            try {
                data = JSON.parse(rawText);
            } catch (parseErr) {
                console.error("Failed to parse JSON from backend:", parseErr);
                imageContainerText.innerText = "⚠️ Error: backend returned invalid JSON. Check console for details.";
                return;
            }
        }

        // Handle backend errors (non-OK status)
        if (!response.ok) {
            console.error("Backend returned non-OK status:", response.status, data);
            imageContainerText.innerText = (data && data.message)
                ? data.message
                : `⚠️ Server error (${response.status}). Please try again later.`;
            return;
        }

        // Normal successful flow — backend returned image(s)
        if (data && Array.isArray(data.images) && data.images.length > 0) {
            imageGenerated.src = data.images[0];
            imageContainerText.innerText = "✅ Here is your generated image:";
        } else {
            imageContainerText.innerText = (data && data.message)
                ? data.message
                : "⚠️ No image was generated. Try a more descriptive prompt.";
        }

    } catch (error) {
        console.error("Fetch error:", error);
        imageContainerText.innerText = "❌ Error generating image. Please try again later.";
    }
}

// Form submission handler
generateImageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const enteredText = formInput.value.trim();

    if (enteredText !== "") {
        fetchImages(enteredText);
    } else {
        imageContainerText.innerText = "⚠️ Input field cannot be empty!";
        imageContainer.style.display = "block";
        imageGenerated.src = "";
    }
});
