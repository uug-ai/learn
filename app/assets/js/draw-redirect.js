// Keep the fragment byte-for-byte, including raw '+' in older base64 links.
const draw = new URL('https://draw.uug.ai/');
draw.hash = window.location.hash;
document.getElementById('draw-redirect').href = draw.href;
window.location.replace(draw.href);
