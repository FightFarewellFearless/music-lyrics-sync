const audioFileInput = document.getElementById("audioFile");
const audioElement = document.getElementById("audioPlayer");
const lyricsInput = document.getElementById("lyricsInput");
const lyricsDisplay = document.getElementById("lyricsDisplay");
const doneButton = document.getElementById("doneButton");

audioFileInput.addEventListener("change", handleAudioUpload);

function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const audioURL = URL.createObjectURL(file);
    const audioElement = document.getElementById("audioPlayer");
    audioElement.src = audioURL;
  }
}

lyricsInput.addEventListener("change", handleLyricsInput);

function handleLyricsInput(event) {
  const lyrics = event.target.value;
  lyricsDisplay.innerHTML = null;
  const lyricsArray = lyrics.split("\n");
  lyricsArray.forEach((element) => {
    const div = document.createElement("div");
    const p = document.createElement("p");
    const timeP = document.createElement("p");
    timeP.className = "lyric-time";
    div.onclick = () => {
      div.scrollIntoView({ behavior: "smooth", block: "center" });
      timeP.textContent = audioElement.currentTime.toFixed(2);
    };
    div.className = "lyric-line-container";
    p.className = "lyric-line";
    p.textContent = element;
    div.appendChild(p);
    div.appendChild(timeP);
    lyricsDisplay.appendChild(div);
  });
}

doneButton.addEventListener("click", handleDone);

function handleDone() {
  if (!audioElement.src) {
    alert("Pilih file terlebih dahulu!");
    return;
  }
  if (lyricsDisplay.children.length === 1) {
    alert("Silakan masukkan lirik terlebih dahulu.");
    return;
  }
  const lyricLines = document.querySelectorAll(".lyric-line-container");
  let lrcContent = "";
  lyricLines.forEach((line) => {
    const time = line.querySelector(".lyric-time").textContent;
    const text = line.querySelector(".lyric-line").textContent;
    if (time) {
      const minutes = String(Math.floor(time / 60)).padStart(2, "0");
      const seconds = String((time % 60).toFixed(2)).padStart(5, "0");
      lrcContent += `[${minutes}:${seconds}] ${text}\n`;
    }
  });
  downloadLRC(lrcContent);
}

function downloadLRC(content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =  audioFileInput.files[0].name.replace(/\.[^/.]+$/, "") + ".lrc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function skipForward(time) {
  audioElement.currentTime += time;
}

function skipBackward(time) {
  audioElement.currentTime -= time;
}
