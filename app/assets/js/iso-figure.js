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
