// Support page guide: a topic, and for problems their urgency, recommends one channel.
(() => {
  const guide = document.querySelector('[data-support-guide]');
  if (!guide) return;

  const urgency = guide.querySelector('[data-guide-urgency]');
  const results = [...guide.querySelectorAll('[data-guide-result]')];
  const reset = guide.querySelector('[data-guide-reset]');

  const show = (channel) => {
    results.forEach((result) => {
      result.hidden = result.dataset.guideResult !== channel;
    });
    reset.hidden = !channel;
  };

  const clear = (inputs) => inputs.forEach((input) => {
    input.checked = false;
  });

  guide.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name === 'support-topic') {
      urgency.hidden = input.dataset.ask !== 'urgency';
      clear(urgency.querySelectorAll('input'));
      show(input.dataset.channel || '');
    } else if (input.name === 'support-urgency') {
      show(input.dataset.channel);
    }
  });

  reset.addEventListener('click', () => {
    clear(guide.querySelectorAll('input'));
    urgency.hidden = true;
    show('');
    guide.querySelector('input').focus();
  });

  guide.hidden = false;
})();
