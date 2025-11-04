let generateImageForm = document.getElementById('generate-image-form');
let formInput = document.getElementById('input-value');
let imageContainerText = document.getElementById('imageContainerText');
let imageGenerated = document.getElementById('generated-image');
let imageContainer = document.getElementById('images-visible');

async function fetchImages(prompt) {
    try {
        // Show loading message
        imageContainerText.innerText = "Generating image... Please wait 15-150 seconds.";
        imageContainer.style.display = "block";
        imageGenerated.src = ""; // clear previous image

        const response = await fetch("/api/generate-image", {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (data.images && data.images.length > 0) {
            imageGenerated.src = data.images[0];
            imageContainerText.innerText = "Here is your generated image:";
        } else {
            imageContainerText.innerText = data.message || "No image was generated. Try a more descriptive prompt.";
        }
    } catch (error) {
        console.error(error);
        imageContainerText.innerText = "Error generating image. Please try again later.";
    }
}

generateImageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredText = formInput.value.trim();
    if (enteredText !== "") {
        fetchImages(enteredText);
    } else {
        imageContainerText.innerText = "Input field cannot be empty!";
        imageContainer.style.display = "block";
        imageGenerated.src = "";
    }
});
