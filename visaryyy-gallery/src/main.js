import images from '../images_b64.json'

// ── Inject images wherever data-key is used in HTML ──────────────────────────
document.querySelectorAll('img[data-key]').forEach(img => {
  const key = img.dataset.key
  if (images[key]) img.src = images[key]
})

// ── Masonry gallery ───────────────────────────────────────────────────────────
// To swap in real photos: add keys to images_b64.json and reference them here.
const photos = [
  { key: 'stage_crowd',      frame: 'F-001', selected: false },
  { key: 'singer_spotlight', frame: 'F-004', selected: true  },
  { key: 'kimono_wave',      frame: 'F-009', selected: false },
  { key: 'stage_dancers',    frame: 'F-012', selected: false },
  { key: 'clap_smile',       frame: 'F-018', selected: true  },
  { key: 'singer_top',       frame: 'F-023', selected: false },
  { key: 'white_border',     frame: 'F-027', selected: true  },
  { key: 'stage_left',       frame: 'F-031', selected: false },
  { key: 'singer_bottom',    frame: 'F-038', selected: false },
  { key: 'stage_right',      frame: 'F-044', selected: true  },
]

const grid = document.getElementById('masonry')

photos.forEach(p => {
  const tile = document.createElement('div')
  tile.className = 'tile' + (p.selected ? ' selected' : '')
  tile.innerHTML =
    `<img src="${images[p.key] ?? ''}" alt="${p.frame}" loading="lazy">` +
    `<div class="tile-overlay"><div class="tile-check"></div></div>` +
    `<div class="tile-frame">${p.frame}</div>`
  tile.addEventListener('click', () => tile.classList.toggle('selected'))
  grid.appendChild(tile)
})
