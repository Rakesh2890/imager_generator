
const generateImageForm = document.getElementById("generate-image-form");
const formInput = document.getElementById("input-value");
const imageContainerText = document.getElementById("imageContainerText");
const imageGenerated = document.getElementById("generated-image");
const imageContainer = document.getElementById("images-visible");

const API_BASE_URL = "/api";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60;

function showContainerMessage(message) {
    imageContainer.style.display = "block";
    imageContainerText.innerText = message;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function readResponse(response) {
    const text = await response.text();

    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text };
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Server error (${response.status})`
        );
    }

    return data;
}

// Start image generation.
async function startGeneration(prompt) {
    const response = await fetch(`${API_BASE_URL}/generate-image`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
    });

    const data = await readResponse(response);

    if (!data.task_id) {
        throw new Error(
            data.message || data.error || "No task ID returned by the server."
        );
    }

    return data;
}

// Poll the backend until Freepik finishes generating the image.
async function pollStatusAndFetchImage(taskId) {
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
        showContainerMessage(
            `⏳ Generating your image... (${attempt}/${MAX_POLL_ATTEMPTS})`
        );

        const response = await fetch(
            `${API_BASE_URL}/status/${encodeURIComponent(taskId)}`
        );

        const data = await readResponse(response);

        const images = data.images || [];

        if (data.status === "COMPLETED" && images.length > 0) {
            return images[0];
        }

        if (data.status === "FAILED") {
            throw new Error(data.message || "Image generation failed.");
        }

        if (data.status === "NOT_FOUND") {
            throw new Error("The generation task was not found by the backend.");
        }

        if (attempt < MAX_POLL_ATTEMPTS) {
            await sleep(POLL_INTERVAL_MS);
        }
    }

    throw new Error(
        "Generation timed out after 5 minutes. Please try again."
    );
}

// Validate and display the generated image.
function displayGeneratedImage(imageUrl) {
    return new Promise((resolve, reject) => {
        imageGenerated.onload = () => resolve();
        imageGenerated.onerror = () => {
            reject(new Error("The generated image could not be loaded."));
        };

        imageGenerated.src = imageUrl;
    });
}

// Main generation workflow.
async function fetchImages(prompt) {
    const submitButton = generateImageForm.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    if (submitButton) {
        submitButton.disabled = true;
    }

    imageGenerated.removeAttribute("src");
    showContainerMessage("🎨 Starting image generation...");

    try {
        const startData = await startGeneration(prompt);

        console.log("Generation started:", startData);

        const imageUrl = await pollStatusAndFetchImage(startData.task_id);

        showContainerMessage("🖼️ Loading your generated image...");

        await displayGeneratedImage(imageUrl);

        showContainerMessage("✅ Here is your generated image!");
    } catch (error) {
        console.error("Image generation error:", error);

        showContainerMessage(
            `Error: ${error.message || "Something went wrong. Please try again."}`
        );

        imageGenerated.removeAttribute("src");
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

// Handle form submission.
generateImageForm.addEventListener("submit", event => {
    event.preventDefault();

    const prompt = formInput.value.trim();

    if (!prompt) {
        imageGenerated.removeAttribute("src");
        showContainerMessage("Please enter a prompt before generating an image.");
        return;
    }

    fetchImages(prompt);
});
