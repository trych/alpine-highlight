# Alpine.js Highlight

Flexible text highlighting for Alpine.js 🔦

## Features

- 💅 **Powerful Highlighting**: Highlight text matches with multiple pattern types (strings, regex, index ranges)
- 🎨 **Multiple Highlight Sets**: Create separate highlight groups with custom styling
- ⚙️ **Advanced Options**: Case-insensitive matching, find all occurrences, accent folding and minimum length modifiers
- 🔍 **Match Information**: Access count and position data through the `$matches` magic helper
- 🔮 **Auto Adaptation**: Uses modern CSS Highlight API with fallback for older browsers

## Installation

### With a CDN

```html
<!-- Alpine Highlight Plugin (must be before Alpine.js) -->
<script src="https://unpkg.com/alpinejs-highlight@latest/dist/highlight.min.js" defer></script>

<!-- Alpine.js -->
<script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
```

### With a Package Manager

```shell
npm install alpinejs-highlight
# or
yarn add alpinejs-highlight
```

```js
import Alpine from 'alpinejs'
import highlight from 'alpinejs-highlight'

Alpine.plugin(highlight)
Alpine.start()
```

## Basic Usage

Alpine.js Highlight adds a new `x-highlight` directive that lets you highlight text within elements. The directive accepts different types of input patterns and highlights matching text. The plugin automatically detects content changes and updates highlights accordingly.

The plugin works in two modes:
1. Using the modern CSS Highlight API (preferred)
2. Falling back to mark elements for older browsers

Here's a simple example:
```html
<div x-data="{ term: 'mark' }">
  <p x-highlight="term">
    A highlighter pen helps mark important passages of text.
  </p>
</div>
```
Result: "A highlighter pen helps <mark>mark</mark> important passages of text."

The search term can be dynamically updated, and the highlights will automatically refresh to match the new term.

The plugin also monitors changes to the text content itself. In the following example, whenever the number `29` appears in the newly generated random numbers, it will be automatically highlighted without requiring any additional code:

```html
<div x-data="{
  myLuckyNumber: 29,
  randomNumbers: '10 29 85 29 47 63 29 91'
}">
  <p x-text="randomNumbers" x-highlight.all="myLuckyNumber"></p>
  <button @click="randomNumbers = Array.from({length: 10}, () => Math.floor(Math.random() * 100)).join(' ')">
    Generate New Numbers
  </button>
</div>
```

## Styling Highlights

The Alpine.js Highlight plugin provides two different methods for styling your highlighted text, depending on browser capabilities. Modern browsers will use the CSS Highlight API, while browsers not supporting the CSS Highlight API fall back to using mark elements. You'll want to define styles for both approaches to ensure consistent highlighting across all browsers.

### Modern browsers (CSS Highlight API)

```css
::highlight(x-highlight) {
  background-color: hotpink;
  text-decoration: underline;
}
```

### Fallback (uses mark elements)

```css
mark.x-highlight {
  background-color: hotpink;
  text-decoration: underline;
}
```

## `x-highlight`

The `x-highlight` directive is used to highlight text within elements based on a given query.

### Basic Syntax

```html
<p x-highlight="expression">Text content to be highlighted</p>
```

### Supported Input Types

- **Strings**: Find and highlight string matches
  ```html
  <p x-highlight="'highlight'">Text with highlight marker</p>
  ```
  Result: "Text with <mark>highlight</mark> marker"

- **Dynamic Variables**: Highlight based on model data
  ```html
  <p x-highlight="searchTerm">Search results will be highlighted</p>
  ```

- **Regular Expressions**: Use regex patterns for more complex matching
  ```html
  <p x-highlight="/mark\w*/g">The marked markings were remarkable</p>
  ```
  Result: "The <mark>marked</mark> <mark>markings</mark> were re<mark>markable</mark>"

- **Arrays of Patterns**: Highlight multiple terms at once
  ```html
  <p x-highlight="['note', 'mark']">Make a note and mark it important</p>
  ```
  Result: "Make a <mark>note</mark> and <mark>mark</mark> it important"

- **Index Ranges**: Highlight by character position
  ```html
  <p x-highlight="[7, 15]">Color highlighted text in documents</p>
  ```
  Result: "Color <mark>highlight</mark>ed text in documents"

- **Multiple Ranges**: Highlight multiple text ranges
  ```html
  <p x-highlight="[[0, 5], [16, 20]]">Color highlighted text in documents</p>
  ```
  Result: "<mark>Color</mark> highlighted <mark>text</mark> in documents"

### Modifiers

The `x-highlight` directive supports several modifiers to customize highlighting behavior:

- **`.all`**: Find all occurrences (by default only the first match is highlighted)
  ```html
  <p x-highlight.all="'e'">Emphasize every essential element</p>
  ```
  Result: "Emphasiz<mark>e</mark> <mark>e</mark>v<mark>e</mark>ry <mark>e</mark>ss<mark>e</mark>ntial <mark>e</mark>l<mark>e</mark>m<mark>e</mark>nt"

- **`.nocase`**: Case-insensitive matching
  ```html
  <p x-highlight.nocase.all="'MARK'">Marking important text with a marker</p>
  ```
  Result: "<mark>Mark</mark>ing important text with a <mark>mark</mark>er"

- **`.min.X`**: Set minimum match length (where X is a number)
  ```html
  <p x-highlight.min.4="'mar'">Marking bookmarks with highlight markers</p>
  ```
  Result: "Marking bookmarks with highlight markers" (no highlights, would only highlight if a fourth character is added)

- **`.fold`**: Accent folding (ignores diacritical marks)
  ```html
  <p x-highlight.fold="'resume'">Make a résumé with highlighted sections</p>
  ```
  Result: "Make a <mark>résumé</mark> with highlighted sections"

### Combining Modifiers

You can combine multiple modifiers to create sophisticated highlighting:

```html
<p x-highlight.all.nocase.min.4.fold="searchTerm">
  Annotated text with potential matches
</p>
```

### Named Highlight Sets

If the first modifier after the directive name is not one of the functional modifiers (`all`, `nocase`, `min`, `fold`), it is interpreted as a naming modifier that creates a custom highlight set.

```html
<p x-highlight.cool="'important'" x-highlight.warning="'caution'">
  This important message requires caution when handling
</p>
```
Possible result: "This <mark>important</mark> message requires <mark>**_caution_**</mark> when handling" (with customizable styles for each highlight set)

These named sets create CSS classes or highlight registrations with the name pattern `x-highlight-{name}`. For example, the modifier `.warning` creates a highlight set called `x-highlight-warning`.

You can style these named sets in your CSS:

#### For modern browsers (CSS Highlight API)
```css
::highlight(x-highlight-cool) {
  background-color: skyblue;
}

::highlight(x-highlight-warning) {
  background-color: orangered;
  text-decoration: underline;
}
```

#### For fallback (mark elements)
```css
mark.x-highlight-cool {
  background-color: skyblue;
}

mark.x-highlight-warning {
  background-color: orangered;
  text-decoration: underline;
}
```

This approach allows you to create multiple distinct highlight styles on the same page for different types of content or importance levels.


## `$matches` Magic Helper

The `$matches` magic helper allows you to access information about the highlighted matches. It provides count and position data for highlighted content within the current Alpine data context.

### Basic Usage

```html
<div x-data="{ term: 'note' }">
  <p x-highlight.all="term">Make a note of these notes and notation marks</p>

  <div>
    Found <span x-text="$matches().count"></span> matches
  </div>
</div>
```

### Options Configuration

The `$matches` magic accepts an options object with the following properties:

- **`selector`**: Target specific element(s) by CSS selector (e.g., `'#content'`)
- **`set`**: Retrieve matches from a specific highlight set (e.g., `'yellow'`)
- **`bounds`**: Include position information for each match when set to `true`

### Targeting Specific Elements

```html
<p id="content" x-highlight.all="term">A noted notation about notes</p>

<div>
  Matches in content: <span x-text="$matches({ selector: '#content' }).count"></span>
</div>
```

### Accessing Specific Highlight Sets

```html
<p x-highlight.yellow="'note'" x-highlight.red="'mark'">
  Notes and markers for annotation
</p>

<div>
  Yellow matches: <span x-text="$matches({ set: 'yellow' }).count"></span>
</div>
```

### Getting Match Details and Bounds

For advanced usage, `$matches` provides detailed information about each match:

```html
<div x-data="{ term: 'highlight' }">
  <p x-highlight.all="term">Text with highlights</p>

  <button @click="
    let result = $matches({ bounds: true });
    console.log(result.matches[0].text); // 'highlight'
    console.log(result.matches[0].index); // position in text
    console.log(result.matches[0].bounds); // DOM position
  ">
    Show Match Details
  </button>
</div>
```

### Combining Options

You can combine multiple options in a single call:

```html
<button @click="
  let specificMatches = $matches({
    selector: '#paragraph-id',
    set: 'primary',
    bounds: true
  });
  console.log(specificMatches);
">
  Analyze Specific Matches
</button>
```

## Browser Support

Alpine.js Highlight uses the modern CSS Highlight API when available, with an automatic fallback to a DOM-based approach for browsers with no CSS Highlight API support (notably Firefox as of March 2025).

### Legacy Mode Configuration

By default, Alpine.js Highlight uses the modern CSS Highlight API when available, with an automatic fallback to a DOM-based approach for browsers without support (notably Firefox as of April 2025). You can customize this behavior with the `legacy` configuration option:

```javascript
// set configuration during Alpine initialization
document.addEventListener('alpine:init', () => {
  Alpine.store('highlightConfig').legacy = 'auto';
});
```

The legacy option accepts these values:

- `'auto'` (default): Automatically detect if the CSS Highlight API is supported
- `true`: Always use legacy mode (DOM-based highlighting) for all browsers
- `false`: Always use CSS Highlight API for all browsers. Unsupported browsers will display no highlights.
- Array of browser names: Use legacy mode only for specified browsers

The array option lets you target specific browsers with known CSS Highlight API inconsistencies. In particular, I found Safari occasionally exhibits highlighting glitches that legacy mode can resolve.

Example to force Safari and Firefox to use legacy mode:

```js
document.addEventListener('alpine:init', () => {
  Alpine.store('highlightConfig').legacy = ['safari', 'firefox'];
});
```

Currently, `safari`, `firefox` and `chrome` are supported array values.


### Browser Compatibility Considerations

With the modern CSS Highlight API, multiple highlight sets can be displayed simultaneously on the same content. Each set applies its styling independently, allowing for overlapping highlights with combined visual effects.

However, when using the fallback implementation (for browsers without CSS Highlight API support), there are some limitations:

* **Single Active Set Per Text Node**: In the fallback mode, only one highlight set can be shown at a time for any given text node. When a new highlight set is added to text that already has highlights, the previous highlights will be removed.
* **Multiple Ranges Support**: Each highlight set can still include multiple ranges within the same text.
* **Multiple Elements Support**: Different elements can each have their own highlight sets, even with the fallback implementation.

For the most consistent experience across browsers, consider these best practices until the CSS Highlight API is fully adopted across all major browsers:

1. Design your application to work with the fallback's single-set-per-node limitation
2. Use separate elements for content that needs different highlight sets


## Known Limitations

### Nested HTML Elements

Alpine.js Highlight only processes direct text content of elements with the `x-highlight` directive. When an element contains nested HTML elements, highlighting will only work for text content up to the first child element. For example:

```html
<p x-highlight="term">This text can be highlighted <span>but this text won't be</span> nor will this text.</p>
```

This limitation applies to both the modern CSS Highlight API implementation and the fallback approach. For content with nested HTML structure, consider these workarounds:

1. Apply the `x-highlight` directive to the innermost elements that contain just text content
   ```html
   <p x-highlight="term">This will be highlighted
     <span x-highlight="term">and so will this</span>
     <span x-highlight="term">and this as well</span>
   </p>
   ```
    However, note that this approach still cannot highlight matches that cross node boundaries. For example, if your search term is "`highlighted and`", the match would span from the main paragraph into the first span, which cannot be properly highlighted with the current implementation.

2. Simplify your content structure by avoiding nested elements when highlighting is needed


## Contributing

If you encounter any issues or have suggestions, please [open an new issue](https://github.com/trych/alpine-highlight/issues).


## License

[MIT](./LICENSE) License © 2025 [Timo Rychert](https://github.com/trych)
