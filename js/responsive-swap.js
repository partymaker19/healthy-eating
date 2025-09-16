const mediaQuery = window.matchMedia('(max-width: 1024px)');
let isSwapped = false;

function handleBreakpointChange(e) {
  const about = document.querySelector('.about');
  const blockImg = document.querySelector('.about__block-img');
  const text = document.querySelector('.about__block-text');
  const serfBlock = document.querySelector('.about__serf-block');
  const modal = document.querySelector('#serf-modal');

  if (!about || !blockImg || !text || !serfBlock || !modal) return;

  if (e.matches && !isSwapped) {
    // Swap for mobile/tablet: text -> girl photo (block-img) -> certificate (serf-block) -> modal
    const fragment = document.createDocumentFragment();

    // Remove from current parents safely
    text.contains(serfBlock) && text.removeChild(serfBlock);
    text.contains(modal) && text.removeChild(modal);
    about.contains(blockImg) || about.contains(text) ? null : null; // noop to keep structure

    // Desired order insertions
    fragment.appendChild(text);
    fragment.appendChild(blockImg);
    fragment.appendChild(serfBlock);
    fragment.appendChild(modal);

    // Clear current about children and rebuild only if structure as expected
    // Instead of clearing, insert in correct order using before/after to avoid layout thrash
    about.insertBefore(text, about.firstChild);
    text.insertAdjacentElement('afterend', blockImg);
    blockImg.insertAdjacentElement('afterend', serfBlock);
    serfBlock.insertAdjacentElement('afterend', modal);

    isSwapped = true;
  } else if (!e.matches && isSwapped) {
    // Restore desktop: image block -> text (with serf + modal inside)
    const fragment = document.createDocumentFragment();

    about.contains(serfBlock) && about.removeChild(serfBlock);
    about.contains(modal) && about.removeChild(modal);

    // Place back certificate and modal into text block
    text.appendChild(serfBlock);
    text.appendChild(modal);

    // Ensure image is before text
    about.insertBefore(blockImg, text);

    isSwapped = false;
  }
}

mediaQuery.addEventListener('change', handleBreakpointChange);
handleBreakpointChange(mediaQuery);