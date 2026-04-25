document.getElementById('generateBtn').addEventListener('click', async () => {
  const keyword = document.getElementById('keyword').value.trim();
  if (!keyword) return;

  const btn = document.getElementById('generateBtn');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');

  btn.disabled = true;
  loading.style.display = 'flex';
  error.style.display = 'none';

  try {
    const res = await fetch('http://localhost:3000/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword })
    });

    const data = await res.json();
    
    if (res.ok && data.url) {
      chrome.tabs.create({ url: data.url });
    } else {
      error.textContent = data.error || 'Failed to generate website.';
      error.style.display = 'block';
    }
  } catch (err) {
    error.textContent = 'Server error. Is the Node backend running?';
    error.style.display = 'block';
  } finally {
    btn.disabled = false;
    loading.style.display = 'none';
  }
});
