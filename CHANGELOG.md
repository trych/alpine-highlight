# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-03-11 - Bug fix release

### Fixed
- Numbers now correctly work as input query for x-highlight

## [1.0.0] - 2025-03-11 - Initial release

### Added
- `x-highlight` directive for text highlighting with modifiers:
  - `.all` - Find all occurrences
  - `.nocase` - Case-insensitive matching
  - `.min.X` - Minimum match length
  - `.fold` - Accent folding support
- Highlight customization via named sets (e.g., `x-highlight.primary`)
- Support for multiple input types:
  - Strings, regex patterns
  - Index-based ranges
  - Arrays of terms
- Native CSS Highlight API with automatic fallback
- `$matches` magic helper to access highlight information
- Automatic DOM content observation for dynamic updates

[1.1.0]: https://github.com/trych/alpine-highlight/releases/tag/v1.1.0
[1.0.0]: https://github.com/trych/alpine-highlight/releases/tag/v1.0.0