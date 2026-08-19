const { spawn } = require('child_process');
const fs = require('fs');

function startTunnel() {
  console.log("Starting cloudflared...");
  const cf = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3000']);

  cf.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      console.log("Cloudflare Tunnel URL:", url);
      fs.writeFileSync('public/ar-tunnel.json', JSON.stringify({ url }));
    }
  });

  cf.on('close', (code) => {
    console.log(`cloudflared exited with code ${code}. Restarting in 5 seconds...`);
    setTimeout(startTunnel, 5000);
  });
}

startTunnel();
