const actionBtn = document.getElementById('actionBtn');
const modeToggle = document.getElementById('modeToggle');
const modeLabel = document.getElementById('mode-label');


let statusTimeout;

function setStatus(message = '', type = 'info') {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) {
    console.warn('status element not found');
    return;
  }

  // set text
  statusDiv.textContent = message || '';

  // remove any previous variant classes
  statusDiv.classList.remove('info', 'success', 'error');

  // add new class only if there's a message
  if (message) statusDiv.classList.add(type || 'info');

  // clear any previous timeout
  if (statusTimeout) {
    clearTimeout(statusTimeout);
    statusTimeout = null;
  }

  // auto-clear non-error messages after 3s
  if (message && type !== 'error') {
    statusTimeout = setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.classList.remove('info', 'success'); // keep errors if any
    }, 3000);
  }
}

let mode = 'encrypt'; // default mode

modeToggle.addEventListener('change', () => {
  mode = modeToggle.checked ? 'encrypt' : 'decrypt';
  modeLabel.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
  actionBtn.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
  setStatus('');
});

actionBtn.addEventListener('click', async () => {
  setStatus(mode === 'encrypt' ? 'Encrypting...' : 'Decrypting...');
  const plaintext = document.getElementById('plaintext').value;
  const password = document.getElementById('password').value;
  const ciphertext = document.getElementById('ciphertext').value;

  if (!password) { setStatus('Please enter password'); return; }

  try {
    if (mode === 'encrypt') {
      if (!plaintext) { setStatus('Please enter plaintext'); return; }
      const res = await fetch('/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaintext, password })
      });
      const j = await res.json();
      if (!res.ok) { setStatus(j.error || 'Encryption failed'); return; }
      document.getElementById('ciphertext').value = j.ciphertext;
      setStatus('Encrypted ✓');
    } else {
      if (!ciphertext) { setStatus('Please enter ciphertext'); return; }
      const res = await fetch('/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciphertext, password })
      });
      const j = await res.json();
      if (!res.ok) { setStatus(j.error || 'Decryption failed'); return; }
      document.getElementById('plaintext').value = j.plaintext;
      setStatus('Decrypted ✓');
    }
  } catch (e) {
    console.error(e);
    setStatus('Network or server error');
  }
});
