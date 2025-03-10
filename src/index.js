export default function (Alpine) {
  // initialize Alpine store with a unique namespace
  Alpine.store('__xHighlightRegistry', {
    instances: {},
    counts: {},
    elementMatchData: new Map()
  });

  // Add $matches magic - no el parameter needed here
  Alpine.magic('matches', () => {
    return (selector = null, setName = null, options = {}) => {
      console.log('$matches called with', selector, setName, options);

      let includeBounds = options.bounds === true;

      let registry = Alpine.store('__xHighlightRegistry');

      if (!registry.elementMatchData) {
        console.error('elementMatchData not found in registry');
        return { count: 0, matches: [] };
      }

      // Get all elements with match data
      let elements = Array.from(registry.elementMatchData.keys());

      // If no elements with match data, return empty result
      if (elements.length === 0) {
        console.log('No elements with match data found');
        return { count: 0, matches: [] };
      }

      // Check if selector is an element selector
      let targetElements = elements;
      if (selector && typeof selector === 'string' && selector.startsWith('#')) {
        let targetEl = document.querySelector(selector);
        if (targetEl && registry.elementMatchData.has(targetEl)) {
          targetElements = [targetEl];
        } else {
          targetElements = [];
        }
      }

      // Determine which highlight set to use
      let highlightSet = null;
      if (selector && typeof selector === 'string' && !selector.startsWith('#')) {
        highlightSet = getHighlightSetName(selector);
      }

      if (setName) {
        highlightSet = getHighlightSetName(setName);
      }

      console.log('Using highlight set:', highlightSet);
      console.log('Target elements:', targetElements.length);

      // Collect all match data
      let result = {
        count: 0,
        matches: []
      };

      // Process each element with match data
      targetElements.forEach(el => {
        let elementData = registry.elementMatchData.get(el);

        if (highlightSet) {
          // If specific highlight set requested
          if (elementData[highlightSet]) {
            console.log(`Found ${elementData[highlightSet].count} matches for set ${highlightSet} in element:`, el);
            result.count += elementData[highlightSet].count;
            result.matches = [...result.matches, ...elementData[highlightSet].matches];
          }
        } else {
          // Get data from all highlight sets
          Object.keys(elementData).forEach(setKey => {
            console.log(`Found ${elementData[setKey].count} matches for set ${setKey} in element:`, el);
            result.count += elementData[setKey].count;
            result.matches = [...result.matches, ...elementData[setKey].matches];
          });
        }
      });

      if (includeBounds) {
        targetElements.forEach(el => {
          let elementData = registry.elementMatchData.get(el);

          // Process each match to include bounds
          if (highlightSet) {
            if (elementData[highlightSet]) {
              addBoundsToMatches(elementData[highlightSet].matches, el);
            }
          } else {
            Object.keys(elementData).forEach(setKey => {
              addBoundsToMatches(elementData[setKey].matches, el);
            });
          }
        });
      }

      console.log('Final result:', result);
      return result;
    };
  });

  Alpine.directive('highlight', (el, { modifiers, expression }, { evaluate, evaluateLater, effect, cleanup }) => {
    console.log('register highlight directive on:', el);

    // known functional modifiers
    let functionalModifiers = ['all', 'nocase', 'min', 'fold'];

    // extract name modifier (first position only) and functional modifiers
    let nameModifier = '';
    let funcMods = [];
    let minLength = 1;

    if (modifiers.length > 0) {
      let firstMod = modifiers[0];
      if (functionalModifiers.includes(firstMod)) {
        funcMods.push(firstMod);
      } else {
        nameModifier = firstMod;
      }

      for (let i = 1; i < modifiers.length; i++) {
        if (modifiers[i-1] === 'min' && !isNaN(parseInt(modifiers[i]))) {
          minLength = parseInt(modifiers[i]);
        } else if (functionalModifiers.includes(modifiers[i])) {
          funcMods.push(modifiers[i]);
        }
      }
    }

    // check for modifiers
    let highlightAll = funcMods.includes('all');
    let isCaseInsensitive = funcMods.includes('nocase');
    let shouldFold = funcMods.includes('fold');

    // build CSS highlight set name using only name modifier
    let cssHighlightSet = getHighlightSetName(nameModifier);

    // get store
    let store = Alpine.store('__xHighlightRegistry');

    // get or create highlight instance and increment count
    if (!store.instances[cssHighlightSet]) {
      store.instances[cssHighlightSet] = new Highlight();
      CSS.highlights.set(cssHighlightSet, store.instances[cssHighlightSet]);
      store.counts[cssHighlightSet] = 0;
    }

    // increment reference count
    store.counts[cssHighlightSet]++;

    let highlight = store.instances[cssHighlightSet];

    // store ranges for this element
    let elementRanges = [];

    let getQuery = evaluateLater(expression);

    effect(() => {
      getQuery(query => {
        highlightText(query);
      })
    })

    // set a mutation observer to update highlight
    // on textContent changes
    let lastContent = el.textContent; // store initial textContent

    let observer = new MutationObserver(mutations => {
      // check if textContent has changed
      if (el.textContent !== lastContent) {
        highlightText(evaluate(expression));
        lastContent = el.textContent; // update last known content
      }
    });

    // start observing content changes
    observer.observe(el, { childList: true, characterData: true });

    // cleanup observer when element is destroyed
    cleanup(() => {
      observer.disconnect();

      // remove this element's ranges
      elementRanges.forEach(range => {
        highlight.delete(range);
      });

      // decrement reference count
      store.counts[cssHighlightSet]--;

      // if no more elements are using this highlight, remove it from CSS.highlights
      if (store.counts[cssHighlightSet] <= 0) {
        CSS.highlights.delete(cssHighlightSet);
        delete store.instances[cssHighlightSet];
        delete store.counts[cssHighlightSet];
      }

      // clean up match data for this element and highlight set
      if (store.elementMatchData.has(el)) {
        let elementData = store.elementMatchData.get(el);
        delete elementData[cssHighlightSet];

        // if no more highlight sets for this element, remove the element from the map
        if (Object.keys(elementData).length === 0) {
          store.elementMatchData.delete(el);
        }
      }
    });

    function highlightText(expression) {
      console.log('Highlighting with expression:', expression);

      // clear previous highlights
      elementRanges.forEach(range => highlight.delete(range));
      elementRanges.length = 0;

      let text = el.textContent;
      let textNode = el.firstChild;
      if (!textNode) return;

      // prepare match data for this element and this highlight set
      if (!store.elementMatchData.has(el)) {
        store.elementMatchData.set(el, {});
      }

      let elementData = store.elementMatchData.get(el);

      // prepare match data for this specific highlight set
      elementData[cssHighlightSet] = {
        count: 0,
        matches: [],
        text: text,
        element: el,
        set: cssHighlightSet
      };

      let matchData = elementData[cssHighlightSet];

      // Check if we have a single range [start, end]
      if (Array.isArray(expression) && expression.length === 2 &&
          typeof expression[0] === 'number' && typeof expression[1] === 'number') {
        console.log('Processing single index range:', expression);
        processIndexRange(expression, text, textNode, matchData);
        return;
      }
      // Check if we have multiple ranges [[start1, end1], [start2, end2], ...]
      else if (Array.isArray(expression) && expression.length > 0 &&
               Array.isArray(expression[0])) {
        console.log('Processing multiple index ranges:', expression);
        let hasValidRanges = false;
        expression.forEach(range => {
          if (Array.isArray(range) && range.length === 2 &&
              typeof range[0] === 'number' && typeof range[1] === 'number') {
            processIndexRange(range, text, textNode, matchData);
            hasValidRanges = true;
          }
        });
        if (hasValidRanges) return;
      }

      // If we get here, handle as string/regex (original logic)
      if (typeof expression === 'string' || expression instanceof RegExp) {
        expression = [expression];
      } else if (!Array.isArray(expression)) {
        return;
      }

      expression.forEach(exp => {
        console.log('Processing expression part:', exp);
        let matches = findMatches(exp, text);
        console.log('Found matches:', matches);

        // update match data
        matchData.count += matches.length;

        matches.forEach(match => {
          try {
            let range = document.createRange();
            range.setStart(textNode, match[0]);
            range.setEnd(textNode, match[1]);
            highlight.add(range);
            elementRanges.push(range);

            // store match data
            let matchedText = text.substring(match[0], match[1]);
            matchData.matches.push({
              text: matchedText,
              index: match[0],
              length: match[1] - match[0]
            });

          } catch (e) {
            console.error('Range error:', e);
          }
        });
      });
    }

    // extract match finding to a separate function
    function findMatches(exp, text) {
      let matches = [];

      if (typeof exp === 'string') {
        if (exp.length < minLength) return matches;

        let searchText = text;
        let searchExp = exp;

        // apply transformations in sequence
        if (shouldFold) {
          searchText = foldAccents(searchText);
          searchExp = foldAccents(searchExp);
        }

        if (isCaseInsensitive) {
          searchText = searchText.toLowerCase();
          searchExp = searchExp.toLowerCase();
        }

        if (highlightAll) {
          let startIndex = 0;
          let index;
          while ((index = searchText.indexOf(searchExp, startIndex)) !== -1) {
            matches.push([index, index + exp.length]);
            startIndex = index + exp.length;
          }
        } else {
          let index = searchText.indexOf(searchExp);
          if (index >= 0) {
            matches.push([index, index + exp.length]);
          }
        }
      } else if (exp instanceof RegExp) {
        // For regex, we need special handling for folding
        if (shouldFold) {
          // create folded version of text
          let foldedText = foldAccents(text);

          // keep original regex flags
          let regexFlags = exp.flags;
          if (isCaseInsensitive && !regexFlags.includes('i')) regexFlags += 'i';
          if (highlightAll && !regexFlags.includes('g')) regexFlags += 'g';

          let regex = new RegExp(exp.source, regexFlags);
          let match;

          while ((match = regex.exec(foldedText)) !== null) {
            if (match[0].length >= minLength) {
              matches.push([match.index, match.index + match[0].length]);
            }
            if (!regex.global) break;
            if (match.index === regex.lastIndex) regex.lastIndex++;
          }
        } else {
          // existing regex handling
          let regexFlags = exp.flags;
          if (isCaseInsensitive && !regexFlags.includes('i')) regexFlags += 'i';
          if (highlightAll && !regexFlags.includes('g')) regexFlags += 'g';

          let regex = new RegExp(exp.source, regexFlags);
          let match;

          while ((match = regex.exec(text)) !== null) {
            if (match[0].length >= minLength) {
              matches.push([match.index, match.index + match[0].length]);
            }
            if (!regex.global) break;
            if (match.index === regex.lastIndex) regex.lastIndex++;
          }
        }
      }

      return matches;
    }

    // helper function to handle index based input
    function processIndexRange(range, text, textNode, matchData) {
      try {
        // validate range
        let startIndex = Math.max(0, range[0]);
        let endIndex = Math.min(text.length, range[1]);

        if (startIndex >= endIndex) {
          console.log('Invalid range (start >= end):', range);
          return;
        }

        console.log('Creating range from', startIndex, 'to', endIndex);

        let r = document.createRange();
        r.setStart(textNode, startIndex);
        r.setEnd(textNode, endIndex);
        highlight.add(r);
        elementRanges.push(r);

        // store match data
        let matchedText = text.substring(startIndex, endIndex);
        matchData.count += 1;
        matchData.matches.push({
          text: matchedText,
          index: startIndex,
          length: endIndex - startIndex
        });

        console.log('Added match:', matchedText, 'at', startIndex, 'to', endIndex);
      } catch (e) {
        console.error('Range error for indices:', range, e);
      }
    }

    function foldAccents(str) {
      // normalize and remove diacritics
      let result = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // replace special characters with their ASCII equivalents
      let specialChars = {
        'æ': 'a',
        'Æ': 'A',
        'œ': 'o',
        'Œ': 'O',
        'ø': 'o',
        'Ø': 'O',
        'ł': 'l',
        'Ł': 'L',
        'đ': 'd',
        'Đ': 'D',
        'ð': 'd',
        'Ð': 'D'
      };

      return result.replace(/[æÆœŒøØłŁđĐðÐ]/g, match => specialChars[match] || match);
    }
  });

  function getHighlightSetName(modifier) {
    // if no modifier or 'default', use the default highlight set name
    if (!modifier || modifier === 'default') {
      return 'x-highlight';
    }

    // for numeric or string modifiers, create the proper set name
    return `x-highlight-${modifier}`;
  }

  function addBoundsToMatches(matches, element) {
    matches.forEach(match => {
      if (!match.bounds) {
        try {
          // Create a temporary range to get bounds
          let range = document.createRange();
          let textNode = element.firstChild;

          if (textNode) {
            range.setStart(textNode, match.index);
            range.setEnd(textNode, match.index + match.length);

            // Get the bounding rectangle
            let rect = range.getBoundingClientRect();

            // Add bounds information to the match
            match.bounds = {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
              width: rect.width,
              height: rect.height
            };
          }
        } catch (e) {
          console.error('Error calculating match bounds:', e);
          match.bounds = null;
        }
      }
    });
  }
}