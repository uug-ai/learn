/*
 * Glossary search (docs/prologue/glossary): filters the terms as you type,
 * matching words that start with what you type, in each term and its
 * definition (so "turn" finds TURN, not "returns"). Letters left without terms are
 * hidden, and greyed out in the A-Z bar. ?q= pre-fills the search; Escape
 * clears it.
 */
document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('#glossary-search')
  if (!input) return
  const content = input.closest('.content')
  const status = document.querySelector('#glossary-search-status')
  const entries = [...content.querySelectorAll('dt')].map((term) => {
    const definition = term.nextElementSibling
    let heading = term.closest('dl').previousElementSibling
    while (heading && heading.tagName !== 'H2') heading = heading.previousElementSibling
    return { term, definition, heading, text: `${term.textContent} ${definition.textContent}`.toLowerCase() }
  })
  const headings = [...new Set(entries.map((entry) => entry.heading))]

  const filter = () => {
    const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const words = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean)
      .map((word) => new RegExp(`(^|[^a-z0-9])${escape(word)}`))
    const shown = new Set()
    let count = 0
    for (const entry of entries) {
      const match = words.every((word) => word.test(entry.text))
      entry.term.hidden = entry.definition.hidden = !match
      if (match) {
        shown.add(entry.heading)
        count += 1
      }
    }
    for (const heading of headings) {
      heading.hidden = !shown.has(heading)
      const letter = document.querySelector(`.learn-glossary-index a[href="#${heading.id}"]`)
      letter?.classList.toggle('is-empty', !shown.has(heading))
    }
    status.textContent = !words.length ? '' : count ? `${count} of ${entries.length} terms` : 'No terms match your search.'
  }

  input.addEventListener('input', filter)
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      input.value = ''
      filter()
    }
  })
  const query = new URLSearchParams(window.location.search).get('q')
  if (query) {
    input.value = query
    filter()
  }
})
