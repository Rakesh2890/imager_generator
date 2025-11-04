let generateImageForm = document.getElementById('generate-image-form');
let formInput = document.getElementById('input-value');
let imageContainerText = document.getElementById('imageContainerText');
let imageGenerated = document.getElementById('generated-image');
let imageContainer = document.getElementById('images-visible');

function showContainerMessage(msg) {
  imageContainer.style.display = "block";
  imageContainerText.innerText = msg;
}

// Start generation -> returns { task_id }
async function startGeneration(prompt) {
  const resp = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  const text = await resp.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

  if (!resp.ok) {
    throw new Error(data?.message || `Server error (${resp.status})`);
  }
  return data; // { task_id, status }
}

// Poll status endpoint until done or timeout
async function pollStatusAndFetchImage(taskId, onProgress) {
  const pollInterval = 5000; // 5s between status checks (tune as needed)
  const maxPolls = 60; // 60 * 5s = 300s total max (tune)
  let attempts = 0;

  while (attempts < maxPolls) {
    attempts++;
    try {
      const resp = await fetch(`/api/status/${taskId}`);
      if (!resp.ok) {
        const txt = await resp.text().catch(()=>null);
        throw new Error(txt || `Status check error ${resp.status}`);
      }
      const data = await resp.json();
      // call progress callback if provided
      if (onProgress) onProgress(data, attempts);

      if (data.status === "COMPLETED" && Array.isArray(data.images) && data.images.length > 0) {
        return data.images[0]; // return first image URL or data URI
      }
      if (data.status === "FAILED") {
        throw new Error(data.message || "Generation failed");
      }
    } catch (err) {
      console.warn("Status poll error:", err);
      // continue polling unless we want to break on certain errors
    }
    await new Promise(r => setTimeout(r, pollInterval));
  }
  throw new Error("Timed out waiting for image");
}

// Combined flow used by UI
async function fetchImages(prompt) {
  try {
    showContainerMessage("🎨 Starting generation...");

    const startData = await startGeneration(prompt);
    console.log("Start response:", startData);

    if (!startData || !startData.task_id) {
      imageContainerText.innerText = startData?.message || "Failed to start generation";
      return;
    }

    const taskId = startData.task_id;
    showContainerMessage("⏳ Image generation started. Waiting for result...");

    const imageUrl = await pollStatusAndFetchImage(taskId, (statusData, attempt) => {
      // update UI with progress - you can make this nicer
      imageContainerText.innerText = `⏳ Generating... (attempt ${attempt}) - status: ${statusData.status}`;
    });

    // set image
    imageGenerated.src = imageUrl;
    imageContainerText.innerText = "✅ Here is your generated image:";
  } catch (err) {
    console.error("Generation flow error:", err);
    imageContainerText.innerText = `Error: ${err.message || "Something went wrong"}`
  }
}

// Form handler
generateImageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const enteredText = formInput.value.trim();
  if (enteredText) {
    fetchImages(enteredText);
  } else {
    imageContainerText.innerText = "Input field cannot be empty!";
    imageContainer.style.display = "block";
    imageGenerated.src = "";
  }
});
