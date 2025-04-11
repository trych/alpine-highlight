# Changelog

All notable changes to this project will be documented in this file.

## [1.2.2] - 2025-04-11

### Fixed
- Updated esbuild to 0.25.0+ to address security vulnerability (CORS settings in development server)
- Republished package with properly built distribution files that were missing in 1.2.1

## [1.2.1] - 2025-04-11

### Fixed
- Remove console warnings

## [1.2.0] - 2025-04-11 - Legacy mode configuration

### Added
- New configurable legacy mode option
- Browser-specific legacy mode targeting
- Runtime configuration through Alpine store

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

[1.1.0]: https://github.com/trych/alpine-highlight/releases/tag/v1.2.1
[1.1.0]: https://github.com/trych/alpine-highlight/releases/tag/v1.2.0
[1.1.0]: https://github.com/trych/alpine-highlight/releases/tag/v1.1.0
[1.0.0]: https://github.com/trych/alpine-highlight/releases/tag/v1.0.0