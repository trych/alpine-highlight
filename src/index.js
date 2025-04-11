export default function (Alpine) {

  // Add global configuration
  Alpine.store('highlightConfig', {
    legacy: 'auto'    // can be true, false, 'auto', or array of browser names
  });

  // check if Highlight API is supported
  let highlightApiSupported = isHighlightApiSupported();

  // initialize Alpine store with a unique namespace
  Alpine.store('__xHighlightRegistry', {
    instances: {},
    counts: {},
    elementMatchData: new Map(),
    get useNativeApi() {
      let config = Alpine.store('highlightConfig');

      // Process legacy setting
      if (config.legacy === true) {
        return false; // Always use legacy mode
      } else if (config.legacy === false) {
        return true;  // Always use native API (if available)
      } else if (Array.isArray(config.legacy)) {
        // check if current browser is in the exception list
        let browsers = config.legacy.map(b => String(b).trim().toLowerCase());

        let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari && browsers.includes('safari')) {
          return false;
        }

        let isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        if (isFirefox && browsers.includes('firefox')) {
          return false;
        }

        let isChrome = /chrome|chromium|crios/i.test(navigator.userAgent) &&
                      !/edg|edge/i.test(navigator.userAgent);
        if (isChrome && browsers.includes('chrome')) {
          return false;
        }

        // for all other cases, use Highlight API
        return true;
      }

      // default fallback - auto-detect
      return isHighlightApiSupported();
    }
  });

  Alpine.magic('matches', () => {
    return (options = {}) => {
      let registry = Alpine.store('__xHighlightRegistry');

      if (!registry.elementMatchData) {
        return { count: 0, matches: [] };
      }

      // Extract options with defaults
      let selector = options.selector || null;
      let setName = options.set || null;
      let includeBounds = options.bounds === true;

      // Get all elements with match data and determine target elements
      let targetElements = Array.from(registry.elementMatchData.keys());

      if (selector && typeof selector === 'string') {
        // querySelectorAll to find all matching elements
        let matchingElements = Array.from(document.querySelectorAll(selector));

        // Filter to only include elements that have match data
        targetElements = matchingElements.filter(el =>
          registry.elementMatchData.has(el)
        );
      }

      // determine which highlight set to use
      let highlightSet = null;
      if (setName) {
        highlightSet = getHighlightSetName(setName);
      }

      // collect all match data
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
            result.count += elementData[highlightSet].count;
            result.matches = [...result.matches, ...elementData[highlightSet].matches];
          }
        } else {
          // Get data from all highlight sets
          Object.keys(elementData).forEach(setKey => {
            result.count += elementData[setKey].count;
            result.matches = [...result.matches, ...elementData[setKey].matches];
          });
        }
      });

      if (includeBounds) {
        // Process match bounds as in the original code
        targetElements.forEach(el => {
          let elementData = registry.elementMatchData.get(el);

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

      return result;
    };
  });

  Alpine.directive('highlight', (el, { modifiers, expression }, { evaluate, evaluateLater, effect, cleanup }) => {
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
    let useNativeApi = store.useNativeApi;

    // For native API: get or create highlight instance and increment count
    if (useNativeApi) {
      if (!store.instances[cssHighlightSet]) {
        store.instances[cssHighlightSet] = new Highlight();
        CSS.highlights.set(cssHighlightSet, store.instances[cssHighlightSet]);
        store.counts[cssHighlightSet] = 0;
      }
      store.counts[cssHighlightSet]++;
    }

    // native API: store ranges for this element
    let elementRanges = [];

    // fallback API: store created mark elements
    let markElements = [];

    // preserve original content for fallback
    let originalContent = el.innerHTML;

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
        if (!useNativeApi) {
          // for fallback, store the new content as original before highlighting
          originalContent = el.innerHTML;
        }
        highlightText(evaluate(expression));
        lastContent = el.textContent; // update last known content
      }
    });

    // start observing content changes
    observer.observe(el, { childList: true, characterData: true });

    // cleanup observer when element is destroyed
    cleanup(() => {
      observer.disconnect();

      if (useNativeApi) {
        // remove this element's ranges
        elementRanges.forEach(range => {
          let highlight = store.instances[cssHighlightSet];
          if (highlight) {
            highlight.delete(range);
          }
        });

        // decrement reference count
        store.counts[cssHighlightSet]--;

        // if no more elements are using this highlight, remove it from CSS.highlights
        if (store.counts[cssHighlightSet] <= 0) {
          CSS.highlights.delete(cssHighlightSet);
          delete store.instances[cssHighlightSet];
          delete store.counts[cssHighlightSet];
        }
      } else {
        // remove mark elements for fallback
        clearMarkElements();
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
      if (useNativeApi) {
        // clear previous highlights
        elementRanges.forEach(range => {
          let highlight = store.instances[cssHighlightSet];
          if (highlight) {
            highlight.delete(range);
          }
        });
        elementRanges.length = 0;
      } else {
        // clear previous mark elements for fallback
        clearMarkElements();
        // restore original content
        el.innerHTML = originalContent;
      }

      let text = el.textContent;

      // prepare match data for this element and this highlight set
      if (!store.elementMatchData.has(el)) {
        store.elementMatchData.set(el, {});
      }

      // prepare match data for this specific highlight set
      store.elementMatchData.get(el)[cssHighlightSet] = {
        count: 0,
        matches: [],
        text: text,
        element: el,
        set: cssHighlightSet
      };

      let matchData = store.elementMatchData.get(el)[cssHighlightSet];

      // Check if we have a single range [start, end]
      if (Array.isArray(expression) && expression.length === 2 &&
          typeof expression[0] === 'number' && typeof expression[1] === 'number') {
        processIndexRange(expression, text, matchData);
        return;
      }
      // Check if we have multiple ranges [[start1, end1], [start2, end2], ...]
      else if (Array.isArray(expression) && expression.length > 0 &&
               Array.isArray(expression[0])) {
        let hasValidRanges = false;
        expression.forEach(range => {
          if (Array.isArray(range) && range.length === 2 &&
              typeof range[0] === 'number' && typeof range[1] === 'number') {
            processIndexRange(range, text, matchData);
            hasValidRanges = true;
          }
        });
        if (hasValidRanges) return;
      }

      if (typeof expression === 'number') {
        expression = String(expression);
      }

      // If we get here, handle as string/regex (original logic)
      if (typeof expression === 'string' || expression instanceof RegExp) {
        expression = [expression];
      } else if (!Array.isArray(expression)) {
        return;
      }

      expression.forEach(exp => {
        let matches = findMatches(exp, text);

        // update match data
        matchData.count += matches.length;

        if (useNativeApi) {
          // Native Highlight API approach
          highlightNative(matches, text, matchData);
        } else {
          // Fallback approach using mark elements
          highlightFallback(matches, text, matchData);
        }
      });
    }

    // helper function for native highlighting
    function highlightNative(matches, text, matchData) {
      let textNode = el.firstChild;
      if (!textNode) return;

      matches.forEach(match => {
        try {
          let range = document.createRange();
          range.setStart(textNode, match[0]);
          range.setEnd(textNode, match[1]);
          store.instances[cssHighlightSet].add(range);
          elementRanges.push(range);

          // store match data
          let matchedText = text.substring(match[0], match[1]);
          matchData.matches.push({
            text: matchedText,
            index: match[0],
            length: match[1] - match[0],
            set: cssHighlightSet  // store the set name with each match
          });

        } catch (e) {
          // silent error handling
        }
      });
    }

    // helper function for fallback highlighting with mark elements
    function highlightFallback(matches, text, matchData) {
      // Sort matches by starting index in reverse order
      // This allows us to work from end to start to avoid index shifting
      matches.sort((a, b) => b[0] - a[0]);

      let content = el.innerHTML;
      // Create encoder/decoder once for all matches
      let encoder = new TextEncoder();
      let contentBuffer = encoder.encode(content);

      // Store operations to apply all at once
      let operations = [];

      matches.forEach((match, matchIndex) => {
        try {
          // Get the matched text
          let matchedText = text.substring(match[0], match[1]);

          // Create unique ID for this match
          let matchId = `${cssHighlightSet}-${matchData.matches.length}`;

          // Store match data with set name and unique ID
          matchData.matches.push({
            text: matchedText,
            index: match[0],
            length: match[1] - match[0],
            set: cssHighlightSet,
            id: matchId
          });

          // Create HTML for the mark element with data-match-id attribute
          let markedText = `<mark class="${cssHighlightSet}" data-match-id="${matchId}">${matchedText}</mark>`;

          // Adjust index from text to content (accounting for HTML tags)
          let currentTextPos = 0;
          let contentPos = 0;
          let startContentPos = -1;

          // Find the position in content that corresponds to the match position in text
          for (let i = 0; i < contentBuffer.length; i++) {
            // Check if we're inside a tag
            if (content[contentPos] === '<') {
              // Skip to the end of the tag
              while (contentPos < content.length && content[contentPos] !== '>') {
                contentPos++;
              }
              contentPos++; // Skip the '>'
              continue;
            }

            if (currentTextPos === match[0]) {
              startContentPos = contentPos;
            }

            if (currentTextPos === match[1]) {
              // Found the end position - store operation rather than applying immediately
              operations.push({
                startPos: startContentPos,
                endPos: contentPos,
                replacement: markedText,
                matchId: matchId,
                matchedText: matchedText
              });
              break;
            }

            currentTextPos++;
            contentPos++;
          }
        } catch (e) {
          // silent error handling
        }
      });

      // Apply all operations in reverse (already sorted)
      operations.forEach(op => {
        content = content.substring(0, op.startPos) +
                  op.replacement +
                  content.substring(op.endPos);

        // Create a mark element and add to our list for cleanup
        let markEl = document.createElement('mark');
        markEl.className = cssHighlightSet;
        markEl.dataset.matchId = op.matchId;
        markEl.textContent = op.matchedText;
        markElements.push(markEl);
      });

      // Update the element's content with our highlighted version - just once
      el.innerHTML = content;
    }

    // clear mark elements in fallback mode
    function clearMarkElements() {
      markElements.forEach(mark => {
        if (mark.parentNode) {
          mark.parentNode.replaceChild(
            document.createTextNode(mark.textContent),
            mark
          );
        }
      });
      markElements = [];
    }

    // extract match finding to a separate function
    function findMatches(exp, text) {
      let matches = [];

      if (typeof exp === 'number') {
        exp = String(exp);
      }

      if (typeof exp === 'string') {
        if (exp.length < minLength) return matches;

        // Use original text for matching but apply transformations for comparison
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
        // For regex, modify flags as needed
        let regexFlags = exp.flags;
        if (isCaseInsensitive && !regexFlags.includes('i')) regexFlags += 'i';
        if (highlightAll && !regexFlags.includes('g')) regexFlags += 'g';

        // For regex, we need special handling for folding
        if (shouldFold) {
          // create folded version of text
          let foldedText = foldAccents(text);
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
    function processIndexRange(range, text, matchData) {
      try {
        // validate range
        let startIndex = Math.max(0, range[0]);
        let endIndex = Math.min(text.length, range[1]);

        if (startIndex >= endIndex) {
          return;
        }

        // store match data
        let matchedText = text.substring(startIndex, endIndex);
        matchData.count += 1;
        matchData.matches.push({
          text: matchedText,
          index: startIndex,
          length: endIndex - startIndex
        });

        if (useNativeApi) {
          let textNode = el.firstChild;
          if (!textNode) return;

          let r = document.createRange();
          r.setStart(textNode, startIndex);
          r.setEnd(textNode, endIndex);
          store.instances[cssHighlightSet].add(r);
          elementRanges.push(r);
        } else {
          // Fallback using mark elements for index-based highlighting
          highlightFallback([[startIndex, endIndex]], text, matchData);
        }
      } catch (e) {
        // silent error handling
      }
    }

    function foldAccents(str) {
      // normalize and remove diacritics
      let result = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // replace special characters with their ASCII equivalents
      let specialChars = {
        'æ': 'a', 'Æ': 'A', 'œ': 'o', 'Œ': 'O',
        'ø': 'o', 'Ø': 'O', 'ł': 'l', 'Ł': 'L',
        'đ': 'd', 'Đ': 'D', 'ð': 'd', 'Ð': 'D'
      };

      return result.replace(/[æÆœŒøØłŁđĐðÐ]/g, match => specialChars[match] || match);
    }
  });

  function getHighlightSetName(modifier) {
    // if no modifier or 'default', use the default highlight set name
    if (modifier && typeof modifier !== 'string') {
      // Safely handle non-string modifiers
      modifier = String(modifier);
    }
    return !modifier || modifier === 'default' ? 'x-highlight' : `x-highlight-${modifier}`;
  }

  function addBoundsToMatches(matches, element) {
    matches.forEach(match => {
      if (!match.bounds) {
        try {
          if (Alpine.store('__xHighlightRegistry').useNativeApi) {
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
          } else {
            // For fallback, find the mark element with the matching data-match-id
            if (match.id) {
              let markElement = element.querySelector(`mark[data-match-id="${match.id}"]`);

              if (markElement) {
                let rect = markElement.getBoundingClientRect();
                match.bounds = {
                  top: rect.top,
                  right: rect.right,
                  bottom: rect.bottom,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height
                };
              }
            }
          }
        } catch (e) {
          match.bounds = null;
        }
      }
    });
  }

  // Helper function to check if the Highlight API is supported
  function isHighlightApiSupported() {
    return typeof CSS !== 'undefined' &&
           typeof CSS.highlights !== 'undefined' &&
           typeof Highlight !== 'undefined';
  }
}
