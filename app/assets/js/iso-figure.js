/*
 * Click-to-replay for iso illustrations ({{< iso-figure >}} shortcode).
 *
 * The figures animate with CSS on a fixed round (data-iso-loop on the <svg>,
 * in seconds). Parts marked data-iso-at (seconds into that round) replay their
 * moment when clicked: every animation in the figure seeks to the same point,
 * so the whole scene stays in step and carries on looping from there.
 */
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('.iso-illustration [data-iso-at]')
  if (!trigger) return
  const svg = trigger.closest('svg')
  const loop = Number(svg?.dataset.isoLoop)
  if (!loop || !svg.getAnimations) return
  // Two rounds in, so every animation is past its start delay.
  const time = (2 * loop + Number(trigger.dataset.isoAt)) * 1000
  for (const animation of svg.getAnimations({ subtree: true })) {
    animation.currentTime = time
    animation.play()
  }
})

/*
 * Click hint for figures whose zones are links (the ecosystem map): a cursor
 * moves from zone to zone and clicks each one, which lights the zone as if it
 * were hovered (data-iso-hint). It fades out for good once the visitor
 * points at or tabs into the figure, and is skipped under reduced motion.
 */
// An arrow cursor with click rays; its tip is set by --tip-x / --tip-y in the stylesheet.
const HINT_POINTER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/>'
  + '<path class="iso-hint-fill" d="M9.04 9.69a.5.5 0 0 1 .65-.65l11 4.5a.5.5 0 0 1-.07.95l-4.35 1.04a1 1 0 0 0-.74.74l-1.04 4.35a.5.5 0 0 1-.95.07z"/></svg>'
const HINT_ORDER = ['factory', 'vault', 'hub', 'agent']
const HINT_STEP = 2200

function startZoneHint(figure) {
  const zones = HINT_ORDER.map((name) => figure.querySelector(`a.iso-zone[data-iso-zone="${name}"]`)).filter(Boolean)
  if (zones.length === 0) return

  const hand = document.createElement('span')
  hand.className = 'iso-hint-hand'
  hand.innerHTML = HINT_POINTER + '<span class="iso-hint-ripple"></span>'
  figure.append(hand)

  let step = 0
  let tap
  const clear = () => zones.forEach((zone) => zone.removeAttribute('data-iso-hint'))
  const move = () => {
    const zone = zones[step % zones.length]
    const tile = zone.querySelector('.iso-zone-tile').getBoundingClientRect()
    const box = figure.getBoundingClientRect()
    clear()
    hand.classList.remove('is-tapping')
    hand.style.transform = `translate(${tile.left + tile.width / 2 - box.left}px, ${tile.top + tile.height / 2 - box.top}px)`
    hand.classList.add('is-visible')
    // Tap once the hand has arrived, and light the zone it tapped.
    tap = window.setTimeout(() => {
      hand.classList.add('is-tapping')
      zone.setAttribute('data-iso-hint', '')
    }, 800)
    // The ripple takes the colour of the zone being tapped.
    hand.style.setProperty('--hint-color', getComputedStyle(zone).getPropertyValue('--iso-color'))
    step += 1
  }
  const timer = window.setInterval(move, HINT_STEP)
  move()

  const stop = () => {
    window.clearInterval(timer)
    window.clearTimeout(tap)
    clear()
    hand.classList.remove('is-visible')
    window.setTimeout(() => hand.remove(), 400)
    figure.removeEventListener('pointerenter', stop)
    figure.removeEventListener('focusin', stop)
  }
  figure.addEventListener('pointerenter', stop)
  figure.addEventListener('focusin', stop)
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  document.querySelectorAll('.iso-illustration-figure').forEach((figure) => {
    if (figure.querySelector('a.iso-zone')) startZoneHint(figure)
  })
})
