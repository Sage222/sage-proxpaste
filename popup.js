const slider   = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
const openBtn  = document.getElementById('openPanel');

chrome.storage.local.get(['typingSpeed'], ({ typingSpeed = 50 }) => {
  slider.value   = typingSpeed;
  speedVal.textContent = typingSpeed;
});

slider.addEventListener('input', () => {
  speedVal.textContent = slider.value;
});

slider.addEventListener('change', () => {
  chrome.storage.local.set({ typingSpeed: parseInt(slider.value) });
});

openBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'openPanel' });
  window.close();
});
